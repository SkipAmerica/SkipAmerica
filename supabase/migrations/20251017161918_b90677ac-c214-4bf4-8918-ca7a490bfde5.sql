-- Enable realtime updates for creator_content table
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_content;

-- Enable full row replication (needed for UPDATE events to include all columns)
ALTER TABLE public.creator_content REPLICA IDENTITY FULL;