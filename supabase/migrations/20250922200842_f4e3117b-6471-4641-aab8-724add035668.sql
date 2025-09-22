-- Add discussion_topic column to call_queue table
ALTER TABLE public.call_queue 
ADD COLUMN discussion_topic TEXT;