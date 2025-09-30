-- Normalize conversation_key in call_private_messages table
-- This ensures both participants always see the same conversation

-- 1. Create function to normalize conversation keys
CREATE OR REPLACE FUNCTION normalize_private_conversation_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Always sort the IDs to ensure consistent conversation_key
  IF NEW.sender_id < NEW.receiver_id THEN
    NEW.conversation_key := NEW.sender_id::text || '|' || NEW.receiver_id::text;
  ELSE
    NEW.conversation_key := NEW.receiver_id::text || '|' || NEW.sender_id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger to call_private_messages
DROP TRIGGER IF EXISTS normalize_conversation_key_trigger ON public.call_private_messages;
CREATE TRIGGER normalize_conversation_key_trigger
  BEFORE INSERT OR UPDATE ON public.call_private_messages
  FOR EACH ROW
  EXECUTE FUNCTION normalize_private_conversation_key();

-- 3. Backfill existing rows with incorrect conversation_key
UPDATE public.call_private_messages
SET conversation_key = CASE
  WHEN sender_id < receiver_id THEN sender_id::text || '|' || receiver_id::text
  ELSE receiver_id::text || '|' || sender_id::text
END
WHERE conversation_key != CASE
  WHEN sender_id < receiver_id THEN sender_id::text || '|' || receiver_id::text
  ELSE receiver_id::text || '|' || sender_id::text
END;

-- 4. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_call_private_messages_conversation_created 
  ON public.call_private_messages(conversation_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lobby_chat_messages_creator_created 
  ON public.lobby_chat_messages(creator_id, created_at DESC);