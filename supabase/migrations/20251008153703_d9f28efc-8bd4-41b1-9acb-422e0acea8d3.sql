-- Create function to clear all queue entries
CREATE OR REPLACE FUNCTION public.clear_all_queues()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.call_queue;
  RAISE NOTICE 'All queue entries cleared';
END;
$$;

-- Grant execute permission to authenticated users (you may want to restrict this further)
GRANT EXECUTE ON FUNCTION public.clear_all_queues() TO authenticated;