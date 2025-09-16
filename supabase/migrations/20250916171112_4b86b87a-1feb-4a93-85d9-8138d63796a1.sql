-- Create messages table for real-time chat
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages they sent or received"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create virtual_gifts table
CREATE TABLE public.virtual_gifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  gift_type text NOT NULL,
  amount numeric NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.virtual_gifts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view gifts they sent or received"
ON public.virtual_gifts
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send gifts"
ON public.virtual_gifts
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create waitlist table for appointments
CREATE TABLE public.appointment_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  fan_id uuid NOT NULL,
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  notes text,
  position integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notified_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own waitlist entries"
ON public.appointment_waitlist
FOR SELECT
USING (auth.uid() = fan_id OR auth.uid() = creator_id);

CREATE POLICY "Fans can join waitlist"
ON public.appointment_waitlist
FOR INSERT
WITH CHECK (auth.uid() = fan_id);

-- Add indexes for performance
CREATE INDEX idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id, created_at);
CREATE INDEX idx_virtual_gifts_recipient ON public.virtual_gifts(recipient_id, created_at);
CREATE INDEX idx_waitlist_creator ON public.appointment_waitlist(creator_id, requested_date);