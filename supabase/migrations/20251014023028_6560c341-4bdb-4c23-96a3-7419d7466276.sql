-- Fix fan ejection from queue during session start
-- REEISSN-approved fix: Separate queue lifecycle (status) from streaming state (fan_state)

-- 1. Update start_almighty_session: Only set fan_state='in_call', keep status='waiting'
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

  -- CRITICAL FIX: Only set fan_state='in_call', DO NOT change status (keeps it 'waiting')
  -- This prevents fan from being ejected from queue while maintaining position lock
  UPDATE call_queue
  SET fan_state = 'in_call'
  WHERE id = p_queue_entry;

  RAISE NOTICE '[start_almighty_session:QUEUE_UPDATED] fan_state=in_call, status remains waiting';
  RAISE NOTICE '[start_almighty_session:SUCCESS] session_id=%', v_session_id;

  RETURN v_session_id;
END;
$function$;

-- 2. Update get_queue_position: Accept 'waiting' OR 'in_call' state, but exclude 'in_call' from counts
CREATE OR REPLACE FUNCTION public.get_queue_position(p_creator_id uuid, p_fan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_entry record;
  v_position int;
  v_total int;
BEGIN
  -- Get fan's queue entry (accept waiting OR in_call state)
  SELECT * INTO v_entry
  FROM call_queue
  WHERE creator_id = p_creator_id
    AND fan_id = p_fan_id
    AND (status = 'waiting' OR fan_state = 'in_call')
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'in_queue', false,
      'position', null,
      'is_front', false,
      'total', 0,
      'needs_consent', false
    );
  END IF;

  -- Special case: If fan is in_call, they're in session (not in visible queue)
  IF v_entry.fan_state = 'in_call' THEN
    RETURN jsonb_build_object(
      'in_queue', true,
      'position', null,
      'is_front', false,
      'total', 0,
      'needs_consent', false,
      'in_session', true,
      'entry', jsonb_build_object(
        'id', v_entry.id,
        'fan_state', v_entry.fan_state,
        'fan_has_consented', v_entry.fan_has_consented,
        'discussion_topic', v_entry.discussion_topic,
        'joined_at', v_entry.joined_at
      )
    );
  END IF;

  -- Calculate position excluding fans in_call (they're hidden from visible queue)
  SELECT COUNT(*) + 1 INTO v_position
  FROM call_queue
  WHERE creator_id = p_creator_id
    AND status = 'waiting'
    AND fan_state != 'in_call'
    AND (
      priority > v_entry.priority
      OR (priority = v_entry.priority AND joined_at < v_entry.joined_at)
      OR (priority = v_entry.priority AND joined_at = v_entry.joined_at AND id < v_entry.id)
    );

  -- Get total visible queue count (exclude in_call)
  SELECT COUNT(*) INTO v_total
  FROM call_queue
  WHERE creator_id = p_creator_id
    AND status = 'waiting'
    AND fan_state != 'in_call';

  RETURN jsonb_build_object(
    'in_queue', true,
    'position', v_position,
    'is_front', v_position = 1,
    'total', v_total,
    'needs_consent', v_position = 1 AND NOT v_entry.fan_has_consented,
    'entry', jsonb_build_object(
      'id', v_entry.id,
      'fan_state', v_entry.fan_state,
      'fan_has_consented', v_entry.fan_has_consented,
      'discussion_topic', v_entry.discussion_topic,
      'joined_at', v_entry.joined_at
    )
  );
END;
$function$;

-- 3. Update cleanup trigger: Delete when status='in_call' OR fan_state='in_call'
CREATE OR REPLACE FUNCTION public.cleanup_queue_on_session_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When session transitions to 'ended', remove associated queue entry
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    DELETE FROM call_queue
    WHERE creator_id = NEW.creator_id
      AND fan_id = NEW.fan_id
      AND (status = 'in_call' OR fan_state = 'in_call');
  END IF;
  
  RETURN NEW;
END;
$function$;