-- Add fan readiness tracking columns to call_queue
ALTER TABLE call_queue
  ADD COLUMN IF NOT EXISTS fan_has_consented boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fan_camera_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fan_preview_updated_at timestamptz;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_call_queue_ready 
  ON call_queue (fan_has_consented, fan_camera_ready);

-- Update RLS policy to allow fans to update their own readiness flags
CREATE POLICY "Fans can update their readiness flags"
  ON call_queue FOR UPDATE
  USING (auth.uid() = fan_id)
  WITH CHECK (auth.uid() = fan_id);

-- Create atomic session creation function with readiness validation
CREATE OR REPLACE FUNCTION start_almighty_session(p_queue_entry uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_fan_id uuid;
  v_consented boolean;
  v_ready boolean;
  v_session_id uuid;
BEGIN
  -- Lock and fetch queue entry
  SELECT creator_id, fan_id, fan_has_consented, fan_camera_ready
  INTO v_creator_id, v_fan_id, v_consented, v_ready
  FROM call_queue
  WHERE id = p_queue_entry
  FOR UPDATE;

  -- Validate creator owns this queue entry
  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Enforce readiness requirement
  IF NOT v_consented OR NOT v_ready THEN
    RAISE EXCEPTION 'fan_not_ready';
  END IF;

  -- Create session (assumes almighty_sessions table exists)
  -- If table doesn't exist yet, this will be a placeholder for future use
  INSERT INTO almighty_sessions (creator_id, fan_id, status)
  VALUES (v_creator_id, v_fan_id, 'active')
  RETURNING id INTO v_session_id;

  -- Insert invite for fan
  INSERT INTO session_invites (session_id, invitee_id, status)
  VALUES (v_session_id, v_fan_id, 'pending');

  -- Update queue entry status
  UPDATE call_queue
  SET status = 'in_call'
  WHERE id = p_queue_entry;

  RETURN v_session_id;
END;
$$;