-- Drop the existing restrictive INSERT policy for lobby_chat_messages
DROP POLICY IF EXISTS "Users can send lobby chat messages when in queue" ON public.lobby_chat_messages;

-- Create new INSERT policy that allows both creators and fans to send messages
CREATE POLICY "Users can send lobby chat messages" 
ON public.lobby_chat_messages 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) AND (
    -- Creators can send messages to their own lobby
    (auth.uid() = creator_id) OR 
    -- Fans can send messages when they're in the queue for this creator
    (EXISTS ( 
      SELECT 1 FROM call_queue 
      WHERE call_queue.creator_id = lobby_chat_messages.creator_id 
      AND call_queue.fan_id = auth.uid() 
      AND call_queue.status = 'waiting'
    ))
  )
);