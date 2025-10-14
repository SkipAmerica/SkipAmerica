-- Enhanced logging for start_almighty_session RPC
-- This migration adds comprehensive logging at every transition point
-- to track fan state changes and session creation flow

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

  -- Insert invite for fan
  INSERT INTO session_invites (session_id, invitee_id, status)
  VALUES (v_session_id, v_fan_id, 'pending');

  RAISE NOTICE '[start_almighty_session:INVITE_CREATED] fan_id=%', v_fan_id;

  -- Mark queue entry as in-call (prevents position 2 from promoting)
  UPDATE call_queue
  SET fan_state = 'in_call', status = 'in_call'
  WHERE id = p_queue_entry;

  RAISE NOTICE '[start_almighty_session:QUEUE_UPDATED] fan_state set to in_call';
  RAISE NOTICE '[start_almighty_session:SUCCESS] session_id=%', v_session_id;

  RETURN v_session_id;
END;
$function$;