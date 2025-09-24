-- Add last_seen column to call_queue table for heartbeat tracking
ALTER TABLE public.call_queue 
ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- Update existing entries to have a last_seen timestamp
UPDATE public.call_queue 
SET last_seen = created_at 
WHERE last_seen IS NULL;

-- Create function to cleanup stale queue entries
CREATE OR REPLACE FUNCTION public.cleanup_stale_queue_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove queue entries where user hasn't been seen for more than 3 minutes
  DELETE FROM public.call_queue 
  WHERE last_seen < (now() - INTERVAL '3 minutes');
  
  -- Log cleanup for monitoring
  RAISE NOTICE 'Cleaned up stale queue entries older than 3 minutes';
END;
$$;

-- Create trigger function to automatically update last_seen timestamp
CREATE OR REPLACE FUNCTION public.update_queue_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic last_seen updates on queue updates
CREATE TRIGGER update_call_queue_last_seen
  BEFORE UPDATE ON public.call_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_queue_last_seen();