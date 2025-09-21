-- Create call_queue table for managing live session queues
CREATE TABLE public.call_queue (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting',
  estimated_wait_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on call_queue
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for call_queue
CREATE POLICY "Creators can view their own queue" 
ON public.call_queue 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Fans can view their queue position" 
ON public.call_queue 
FOR SELECT 
USING (auth.uid() = fan_id);

CREATE POLICY "Fans can join queue" 
ON public.call_queue 
FOR INSERT 
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Creators can update their queue" 
ON public.call_queue 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their queue entries" 
ON public.call_queue 
FOR DELETE 
USING (auth.uid() = creator_id OR auth.uid() = fan_id);

-- Create live_sessions table for tracking session history and metrics
CREATE TABLE public.live_sessions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  calls_taken INTEGER NOT NULL DEFAULT 0,
  total_earnings_cents INTEGER NOT NULL DEFAULT 0,
  queue_peak_count INTEGER NOT NULL DEFAULT 0,
  session_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on live_sessions
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for live_sessions
CREATE POLICY "Creators can manage their own live sessions" 
ON public.live_sessions 
FOR ALL 
USING (auth.uid() = creator_id);

-- Create trigger for automatic timestamp updates on live_sessions
CREATE TRIGGER update_live_sessions_updated_at
BEFORE UPDATE ON public.live_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime publication for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;

-- Set replica identity for real-time updates
ALTER TABLE public.call_queue REPLICA IDENTITY FULL;
ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;