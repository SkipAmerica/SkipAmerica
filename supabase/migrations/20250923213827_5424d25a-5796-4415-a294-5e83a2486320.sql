-- Add RLS policy for creators to delete their own lobby chat messages
CREATE POLICY "Creators can delete their own lobby chat messages"
ON public.lobby_chat_messages
FOR DELETE
USING (auth.uid() = creator_id);