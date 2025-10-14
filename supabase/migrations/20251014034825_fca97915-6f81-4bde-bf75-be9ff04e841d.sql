-- Enable full row replication for reliable UPDATE/DELETE events
ALTER TABLE public.session_invites REPLICA IDENTITY FULL;

-- Add table to realtime publication so clients can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_invites;