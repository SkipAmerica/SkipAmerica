-- Add state enum for fan queue progression
CREATE TYPE queue_fan_state AS ENUM (
  'waiting',           -- In queue, position > 1
  'awaiting_consent',  -- At position #1, modal shown
  'ready',             -- Consented, camera ready
  'declined',          -- Left queue voluntarily
  'in_call'            -- Session started
);

-- Add state column to call_queue
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS fan_state queue_fan_state NOT NULL DEFAULT 'waiting';

-- Migrate existing data
UPDATE call_queue
SET fan_state = CASE
  WHEN status = 'in_call' THEN 'in_call'::queue_fan_state
  WHEN fan_has_consented = true AND fan_camera_ready = true THEN 'ready'::queue_fan_state
  WHEN fan_has_consented = false THEN 'awaiting_consent'::queue_fan_state
  ELSE 'waiting'::queue_fan_state
END;

-- Add index for efficient state queries
CREATE INDEX IF NOT EXISTS idx_call_queue_fan_state 
  ON call_queue (fan_state, creator_id);

-- Update RPC to use new state column
CREATE OR REPLACE FUNCTION start_almighty_session(p_queue_entry uuid)
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

  -- Verify almighty_sessions table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'almighty_sessions'
  ) THEN
    RAISE EXCEPTION 'almighty_sessions table does not exist';
  END IF;

  -- Create session
  INSERT INTO almighty_sessions (creator_id, fan_id, status)
  VALUES (v_creator_id, v_fan_id, 'active')
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

-- Secure RLS policy: only allow fans to update their own state
DROP POLICY IF EXISTS "Fans can update their readiness flags" ON call_queue;

CREATE POLICY "Fans can update their own queue state"
  ON call_queue FOR UPDATE
  USING (auth.uid() = fan_id)
  WITH CHECK (
    auth.uid() = fan_id 
    AND fan_state IN ('awaiting_consent', 'ready', 'declined')
    AND status = 'waiting'
  );