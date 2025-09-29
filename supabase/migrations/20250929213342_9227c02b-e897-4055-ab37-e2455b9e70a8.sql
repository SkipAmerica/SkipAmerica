-- Create call_private_messages table for in-call 1-on-1 chat
CREATE TABLE public.call_private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_key TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on conversation_key for efficient filtering
CREATE INDEX idx_call_private_messages_conversation_key ON public.call_private_messages(conversation_key);

-- Create index on created_at for ordering
CREATE INDEX idx_call_private_messages_created_at ON public.call_private_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.call_private_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages where they are sender OR receiver
CREATE POLICY "Users can view their private messages"
ON public.call_private_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can send messages where they are the sender
CREATE POLICY "Users can send private messages"
ON public.call_private_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_private_messages;