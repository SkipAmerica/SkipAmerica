-- Enhanced get_queue_position function with self-healing for stale in_call entries
CREATE OR REPLACE FUNCTION public.get_queue_position(p_creator_id uuid, p_fan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry record;
  v_position int;
  v_total int;
  v_has_active_session boolean;
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

  -- Self-healing: If fan_state='in_call', check for active session
  IF v_entry.fan_state = 'in_call' THEN
    SELECT EXISTS (
      SELECT 1 FROM almighty_sessions
      WHERE creator_id = p_creator_id
        AND fan_id = p_fan_id
        AND status = 'active'
        AND ended_at IS NULL
    ) INTO v_has_active_session;
    
    IF NOT v_has_active_session THEN
      -- No active session - treat as stale, return special response
      RAISE NOTICE '[get_queue_position:self_healed] Fan stuck in in_call without active session: entry_id=%, creator=%, fan=%',
        v_entry.id, p_creator_id, p_fan_id;
      
      RETURN jsonb_build_object(
        'in_queue', false,
        'position', null,
        'is_front', false,
        'total', 0,
        'needs_consent', false,
        'stale_entry', true,
        'entry', jsonb_build_object(
          'id', v_entry.id,
          'fan_state', v_entry.fan_state,
          'created_at', v_entry.joined_at
        )
      );
    END IF;
    
    -- Has active session - return in_session response
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
$$;

COMMENT ON FUNCTION public.get_queue_position IS 'Returns queue position with self-healing for stale in_call entries';

-- Enhanced cleanup trigger with detailed logging
CREATE OR REPLACE FUNCTION public.cleanup_queue_on_session_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count integer;
  v_deleted_ids text[];
BEGIN
  -- When session transitions to 'ended', remove associated queue entry
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    
    RAISE NOTICE '[cleanup_queue_on_session_end] Triggered for session_id=%, creator=%, fan=%', 
      NEW.id, NEW.creator_id, NEW.fan_id;
    
    -- Delete with RETURNING to get IDs and count
    WITH deleted AS (
      DELETE FROM call_queue
      WHERE creator_id = NEW.creator_id
        AND fan_id = NEW.fan_id
        AND (status = 'in_call' OR fan_state = 'in_call')
      RETURNING id::text
    )
    SELECT COUNT(*), array_agg(id) INTO v_deleted_count, v_deleted_ids FROM deleted;
    
    IF v_deleted_count > 0 THEN
      RAISE NOTICE '[cleanup_queue_on_session_end] Deleted % queue entries: %', 
        v_deleted_count, v_deleted_ids;
    ELSE
      RAISE WARNING '[cleanup_queue_on_session_end] No queue entries found to delete for session=%, creator=%, fan=%',
        NEW.id, NEW.creator_id, NEW.fan_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.cleanup_queue_on_session_end IS 'Cleans up queue entries when session ends, with detailed logging';