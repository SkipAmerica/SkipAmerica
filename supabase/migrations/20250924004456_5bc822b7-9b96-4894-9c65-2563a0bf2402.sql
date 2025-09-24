-- Create queues table for queueId to creator_user_id mapping
CREATE TABLE public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;

-- Policy: Anonymous users can resolve creator from queueId
CREATE POLICY "Anon can resolve creator from queueId" 
ON public.queues 
FOR SELECT 
USING (true);

-- Add index for fast lookups
CREATE INDEX idx_queues_id ON public.queues (id);
CREATE INDEX idx_queues_creator_user_id ON public.queues (creator_user_id);