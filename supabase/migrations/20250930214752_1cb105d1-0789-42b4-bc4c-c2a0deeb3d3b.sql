-- Fix search_path for the normalize function to address security warning
CREATE OR REPLACE FUNCTION normalize_private_conversation_key()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always sort the IDs to ensure consistent conversation_key
  IF NEW.sender_id < NEW.receiver_id THEN
    NEW.conversation_key := NEW.sender_id::text || '|' || NEW.receiver_id::text;
  ELSE
    NEW.conversation_key := NEW.receiver_id::text || '|' || NEW.sender_id::text;
  END IF;
  RETURN NEW;
END;
$$;