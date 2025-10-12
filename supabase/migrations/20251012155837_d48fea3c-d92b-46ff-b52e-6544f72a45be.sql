-- Ensure fan_has_consented is always false for new queue entries
-- This prevents client-side bypasses and ensures clean consent state
CREATE OR REPLACE FUNCTION reset_consent_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Force consent to false on INSERT (prevents client from bypassing)
  NEW.fan_has_consented := false;
  NEW.fan_state := 'waiting'::queue_fan_state;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists to ensure clean recreation
DROP TRIGGER IF EXISTS ensure_consent_reset_on_insert ON call_queue;

-- Create trigger to reset consent on every new queue entry
CREATE TRIGGER ensure_consent_reset_on_insert
  BEFORE INSERT ON call_queue
  FOR EACH ROW
  EXECUTE FUNCTION reset_consent_on_insert();