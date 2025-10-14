-- Add creator info columns to session_invites
ALTER TABLE session_invites 
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS creator_avatar_url TEXT;

-- Fix RLS policy to allow heartbeat updates for in_call fans
DROP POLICY IF EXISTS "Fans can update their own queue state" ON call_queue;

CREATE POLICY "Fans can update their own queue state" ON call_queue
FOR UPDATE
USING (auth.uid() = fan_id)
WITH CHECK (
  auth.uid() = fan_id 
  AND (
    -- Allow state changes only for these states
    (fan_state = ANY (ARRAY['awaiting_consent'::queue_fan_state, 'ready'::queue_fan_state, 'declined'::queue_fan_state]) AND status = 'waiting'::text)
    -- OR allow heartbeat-only updates (last_seen) regardless of state
    OR (fan_state = 'in_call'::queue_fan_state)
  )
);

-- Update start_almighty_session to populate creator info directly
CREATE OR REPLACE FUNCTION public.start_almighty_session(p_queue_entry uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_creator_id uuid;
  v_fan_id uuid;
  v_fan_state queue_fan_state;
  v_session_id uuid;
BEGIN
  RAISE NOTICE '[start_almighty_session:ENTRY] queue_entry=%, caller=%', p_queue_entry, auth.uid();
  
  -- Lock and fetch queue entry
  SELECT creator_id, fan_id, fan_state
  INTO v_creator_id, v_fan_id, v_fan_state
  FROM call_queue
  WHERE id = p_queue_entry
  FOR UPDATE;

  RAISE NOTICE '[start_almighty_session:LOCKED] creator=%, fan=%, state=%', v_creator_id, v_fan_id, v_fan_state;

  -- Validate creator owns this queue entry
  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Enforce readiness requirement using state enum
  IF v_fan_state != 'ready' THEN
    RAISE EXCEPTION 'fan_not_ready' USING HINT = format('Fan state is %s, expected ready', v_fan_state);
  END IF;

  RAISE NOTICE '[start_almighty_session:VALIDATED] Creating session';

  -- Create production session (is_dev = FALSE)
  INSERT INTO almighty_sessions (creator_id, fan_id, status, queue_entry_id, is_dev)
  VALUES (v_creator_id, v_fan_id, 'active', p_queue_entry, FALSE)
  RETURNING id INTO v_session_id;

  RAISE NOTICE '[start_almighty_session:SESSION_CREATED] session_id=%', v_session_id;

  -- Insert invite with creator info using INSERT...SELECT (REEISSN approach)
  INSERT INTO session_invites (
    session_id, 
    invitee_id, 
    status,
    creator_name,
    creator_avatar_url
  )
  SELECT 
    v_session_id,
    v_fan_id,
    'pending',
    c.full_name,
    c.avatar_url
  FROM creators c
  WHERE c.id = v_creator_id;

  RAISE NOTICE '[start_almighty_session:INVITE_CREATED] fan_id=%, with_creator_info', v_fan_id;

  -- Set fan_state='in_call', keep status='waiting' to maintain queue position
  UPDATE call_queue
  SET fan_state = 'in_call'
  WHERE id = p_queue_entry;

  RAISE NOTICE '[start_almighty_session:QUEUE_UPDATED] fan_state=in_call, status remains waiting';
  RAISE NOTICE '[start_almighty_session:SUCCESS] session_id=%', v_session_id;

  RETURN v_session_id;
END;
$function$;