-- Create sponsors table for ad revenue model
CREATE TABLE public.sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  ad_budget NUMERIC NOT NULL DEFAULT 0,
  target_audience JSONB DEFAULT '{}',
  campaign_start DATE,
  campaign_end DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad_placements table for tracking ad displays and revenue
CREATE TABLE public.ad_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL,
  placement_type TEXT NOT NULL, -- 'banner', 'popup', 'sponsored_creator', 'feed_ad'
  target_user_id UUID,
  target_creator_id UUID,
  click_through_rate NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collaborative_events table for creator joint events
CREATE TABLE public.collaborative_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_price NUMERIC NOT NULL,
  max_participants INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_collaborators table for profit sharing
CREATE TABLE public.event_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  profit_share_percentage NUMERIC NOT NULL DEFAULT 0,
  role TEXT DEFAULT 'guest', -- 'host', 'co-host', 'guest'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount_paid NUMERIC NOT NULL,
  registration_status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sponsors (admin only)
CREATE POLICY "Only admins can manage sponsors" 
ON public.sponsors 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- RLS Policies for ad_placements
CREATE POLICY "Users can view ads targeted to them" 
ON public.ad_placements 
FOR SELECT 
USING (target_user_id = auth.uid() OR target_creator_id = auth.uid() OR target_user_id IS NULL);

CREATE POLICY "System can manage ad placements" 
ON public.ad_placements 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- RLS Policies for collaborative_events
CREATE POLICY "Creators can manage their events" 
ON public.collaborative_events 
FOR ALL 
USING (host_creator_id = auth.uid());

CREATE POLICY "Everyone can view active events" 
ON public.collaborative_events 
FOR SELECT 
USING (status = 'scheduled');

-- RLS Policies for event_collaborators
CREATE POLICY "Event hosts can manage collaborators" 
ON public.event_collaborators 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.collaborative_events 
  WHERE id = event_collaborators.event_id 
  AND host_creator_id = auth.uid()
));

CREATE POLICY "Collaborators can view their own entries" 
ON public.event_collaborators 
FOR SELECT 
USING (creator_id = auth.uid());

-- RLS Policies for event_registrations
CREATE POLICY "Users can register for events" 
ON public.event_registrations 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their registrations" 
ON public.event_registrations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Event hosts can view registrations" 
ON public.event_registrations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.collaborative_events 
  WHERE id = event_registrations.event_id 
  AND host_creator_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_sponsors_updated_at
BEFORE UPDATE ON public.sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborative_events_updated_at
BEFORE UPDATE ON public.collaborative_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();