-- Create atomic queue position calculator function
CREATE OR REPLACE FUNCTION public.get_queue_position(
  p_creator_id uuid,
  p_fan_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry record;
  v_position int;
  v_total int;
BEGIN
  -- Get fan's queue entry with row lock for consistency
  SELECT * INTO v_entry
  FROM call_queue
  WHERE creator_id = p_creator_id
    AND fan_id = p_fan_id
    AND status = 'waiting'
  FOR SHARE;  -- Read lock (allows concurrent reads)

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'in_queue', false,
      'position', null,
      'is_front', false,
      'total', 0,
      'needs_consent', false
    );
  END IF;

  -- Calculate position with canonical ordering (priority DESC, joined_at ASC, id ASC)
  SELECT COUNT(*) + 1 INTO v_position
  FROM call_queue
  WHERE creator_id = p_creator_id
    AND status = 'waiting'
    AND (
      priority > v_entry.priority
      OR (priority = v_entry.priority AND joined_at < v_entry.joined_at)
      OR (priority = v_entry.priority AND joined_at = v_entry.joined_at AND id < v_entry.id)
    );

  -- Get total queue count
  SELECT COUNT(*) INTO v_total
  FROM call_queue
  WHERE creator_id = p_creator_id
    AND status = 'waiting';

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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_queue_position(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_queue_position IS 'Atomically calculates queue position for a fan. Returns position, is_front status, and consent requirements. Uses row-level locking for consistency.';