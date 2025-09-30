-- Update lobby chat RLS policy to allow all authenticated users to view
DROP POLICY IF EXISTS "Users can view lobby chat for creators they follow or are in qu" ON public.lobby_chat_messages;

CREATE POLICY "Authenticated users can view lobby chat"
ON public.lobby_chat_messages
FOR SELECT
TO authenticated
USING (true);

-- Keep the insert policy the same but simplify it
DROP POLICY IF EXISTS "Users can send lobby chat messages" ON public.lobby_chat_messages;

CREATE POLICY "Users can send lobby chat messages"
ON public.lobby_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);