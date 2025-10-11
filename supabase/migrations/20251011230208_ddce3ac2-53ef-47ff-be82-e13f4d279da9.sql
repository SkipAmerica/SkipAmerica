-- Almighty Production Wiring: Session Tables, RLS, Triggers, and Dev Support
-- Enables production Queue→Session flow + /dev/almighty testing

-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.almighty_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  queue_entry_id UUID REFERENCES public.call_queue(id) ON DELETE SET NULL,
  is_dev BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  CONSTRAINT almighty_participants_distinct
    CHECK (creator_id <> fan_id OR is_dev = TRUE)
);

CREATE TABLE IF NOT EXISTS public.session_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.almighty_sessions(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT unique_session_invite UNIQUE (session_id, invitee_id)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_almighty_sessions_creator ON public.almighty_sessions (creator_id);
CREATE INDEX IF NOT EXISTS idx_almighty_sessions_fan ON public.almighty_sessions (fan_id);
CREATE INDEX IF NOT EXISTS idx_almighty_sessions_status_created ON public.almighty_sessions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_invites_session ON public.session_invites (session_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_invitee ON public.session_invites (invitee_id);

-- 3. DURATION TRIGGER
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS DISTINCT FROM 'ended') THEN
    NEW.ended_at := COALESCE(NEW.ended_at, now());
    NEW.duration_seconds := COALESCE(NEW.duration_seconds,
      EXTRACT(EPOCH FROM (NEW.ended_at - NEW.created_at))::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_session_duration ON public.almighty_sessions;
CREATE TRIGGER trg_set_session_duration
  BEFORE UPDATE ON public.almighty_sessions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_session_duration();

-- 4. RLS
ALTER TABLE public.almighty_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_invites ENABLE ROW LEVEL SECURITY;

-- Sessions: participants (creator or fan) can SELECT; creator can INSERT/UPDATE their own rows
DROP POLICY IF EXISTS almighty_sessions_select ON public.almighty_sessions;
CREATE POLICY almighty_sessions_select
  ON public.almighty_sessions FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = fan_id);

DROP POLICY IF EXISTS almighty_sessions_insert_creator ON public.almighty_sessions;
CREATE POLICY almighty_sessions_insert_creator
  ON public.almighty_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS almighty_sessions_update_creator ON public.almighty_sessions;
CREATE POLICY almighty_sessions_update_creator
  ON public.almighty_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Invites: invitee can SELECT/UPDATE their invite; creator can INSERT for session participants
DROP POLICY IF EXISTS session_invites_select ON public.session_invites;
CREATE POLICY session_invites_select
  ON public.session_invites FOR SELECT TO authenticated
  USING (auth.uid() = invitee_id OR auth.uid() IN (
    SELECT creator_id FROM public.almighty_sessions s WHERE s.id = session_id
  ));

DROP POLICY IF EXISTS session_invites_insert_creator ON public.session_invites;
CREATE POLICY session_invites_insert_creator
  ON public.session_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT creator_id FROM public.almighty_sessions s WHERE s.id = session_id
  ));

DROP POLICY IF EXISTS session_invites_update_invitee ON public.session_invites;
CREATE POLICY session_invites_update_invitee
  ON public.session_invites FOR UPDATE TO authenticated
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Dev session cleanup: allow creators to delete their own dev sessions older than 24h
DROP POLICY IF EXISTS almighty_sessions_delete_dev ON public.almighty_sessions;
CREATE POLICY almighty_sessions_delete_dev
  ON public.almighty_sessions FOR DELETE TO authenticated
  USING (
    is_dev = TRUE AND creator_id = auth.uid() AND created_at < now() - interval '24 hours'
  );

-- 5. RPC: Create dev session for /dev/almighty
CREATE OR REPLACE FUNCTION public.create_dev_session(_label text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_creator uuid := auth.uid();
  v_session uuid;
BEGIN
  IF v_creator IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Create self-test session (creator is both creator and fan for dev)
  INSERT INTO public.almighty_sessions(creator_id, fan_id, status, is_dev)
  VALUES (v_creator, v_creator, 'active', TRUE)
  RETURNING id INTO v_session;

  -- Auto-accept invite for dev session
  INSERT INTO public.session_invites(session_id, invitee_id, status)
  VALUES (v_session, v_creator, 'accepted')
  ON CONFLICT DO NOTHING;

  RETURN v_session;
END;
$$;

-- 6. UPDATE existing start_almighty_session to explicitly set is_dev = FALSE
CREATE OR REPLACE FUNCTION public.start_almighty_session(p_queue_entry uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_fan_id uuid;
  v_fan_state queue_fan_state;
  v_session_id uuid;
BEGIN
  -- Lock and fetch queue entry
  SELECT creator_id, fan_id, fan_state
  INTO v_creator_id, v_fan_id, v_fan_state
  FROM call_queue
  WHERE id = p_queue_entry
  FOR UPDATE;

  -- Validate creator owns this queue entry
  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Enforce readiness requirement using state enum
  IF v_fan_state != 'ready' THEN
    RAISE EXCEPTION 'fan_not_ready' USING HINT = format('Fan state is %s, expected ready', v_fan_state);
  END IF;

  -- Create production session (is_dev = FALSE)
  INSERT INTO almighty_sessions (creator_id, fan_id, status, queue_entry_id, is_dev)
  VALUES (v_creator_id, v_fan_id, 'active', p_queue_entry, FALSE)
  RETURNING id INTO v_session_id;

  -- Insert invite for fan
  INSERT INTO session_invites (session_id, invitee_id, status)
  VALUES (v_session_id, v_fan_id, 'pending');

  -- Update queue entry state
  UPDATE call_queue
  SET fan_state = 'in_call', status = 'in_call'
  WHERE id = p_queue_entry;

  RETURN v_session_id;
END;
$$;