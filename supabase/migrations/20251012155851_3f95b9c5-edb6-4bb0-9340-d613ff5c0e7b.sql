-- Fix search_path security warning for reset_consent_on_insert function
CREATE OR REPLACE FUNCTION reset_consent_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Force consent to false on INSERT (prevents client from bypassing)
  NEW.fan_has_consented := false;
  NEW.fan_state := 'waiting'::queue_fan_state;
  RETURN NEW;
END;
$$;