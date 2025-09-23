-- Add priority column to call_queue table
ALTER TABLE public.call_queue 
ADD COLUMN priority integer NOT NULL DEFAULT 0;

-- Create index for efficient queue ordering
CREATE INDEX idx_call_queue_priority_order ON public.call_queue(creator_id, priority DESC, joined_at ASC);

-- Create lobby chat messages table
CREATE TABLE public.lobby_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lobby_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for lobby chat
CREATE POLICY "Users can view lobby chat for creators they follow or are in queue for" 
ON public.lobby_chat_messages 
FOR SELECT 
USING (
  -- Users can see messages for creators they're in queue for
  EXISTS (
    SELECT 1 FROM public.call_queue 
    WHERE call_queue.creator_id = lobby_chat_messages.creator_id 
    AND call_queue.fan_id = auth.uid()
  ) 
  OR 
  -- Or the creator can see their own lobby chat
  auth.uid() = creator_id
);

CREATE POLICY "Users can send lobby chat messages when in queue" 
ON public.lobby_chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.call_queue 
    WHERE call_queue.creator_id = lobby_chat_messages.creator_id 
    AND call_queue.fan_id = auth.uid()
    AND call_queue.status = 'waiting'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_lobby_chat_messages_updated_at
BEFORE UPDATE ON public.lobby_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_chat_messages;