-- Advanced pricing and analytics tables
CREATE TABLE public.pricing_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  current_demand_score NUMERIC DEFAULT 50,
  base_price_per_minute NUMERIC NOT NULL DEFAULT 5.00,
  surge_multiplier NUMERIC DEFAULT 1.0,
  competitor_avg_price NUMERIC DEFAULT 5.00,
  performance_score NUMERIC DEFAULT 50,
  booking_velocity INTEGER DEFAULT 0,
  peak_hours JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator playlists and content curation
CREATE TABLE public.creator_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.playlist_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL,
  content_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referral and loyalty system
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER DEFAULT 0,
  commission_rate NUMERIC DEFAULT 10.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.fan_loyalty (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  total_spent NUMERIC DEFAULT 0,
  tier_level INTEGER DEFAULT 1,
  points NUMERIC DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fan_id, creator_id)
);

-- Trending and discovery algorithm
CREATE TABLE public.trend_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  trend_score NUMERIC DEFAULT 0,
  recent_bookings INTEGER DEFAULT 0,
  social_engagement NUMERIC DEFAULT 0,
  press_mentions INTEGER DEFAULT 0,
  rising_star_score NUMERIC DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced content and community features
CREATE TABLE public.content_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL, -- 'like', 'heart', 'fire', 'star'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id, reaction_type)
);

CREATE TABLE public.content_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.pricing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators can manage their pricing analytics" 
ON public.pricing_analytics 
FOR ALL 
USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view pricing analytics" 
ON public.pricing_analytics 
FOR SELECT 
USING (true);

CREATE POLICY "Creators can manage their playlists" 
ON public.creator_playlists 
FOR ALL 
USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view playlists" 
ON public.creator_playlists 
FOR SELECT 
USING (true);

CREATE POLICY "Playlist owners can manage content" 
ON public.playlist_content 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.creator_playlists 
  WHERE id = playlist_content.playlist_id 
  AND creator_id = auth.uid()
));

CREATE POLICY "Everyone can view playlist content" 
ON public.playlist_content 
FOR SELECT 
USING (true);

CREATE POLICY "Creators can manage their referral codes" 
ON public.referral_codes 
FOR ALL 
USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view active referral codes" 
ON public.referral_codes 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can view their loyalty status" 
ON public.fan_loyalty 
FOR SELECT 
USING (auth.uid() = fan_id OR auth.uid() = creator_id);

CREATE POLICY "System can manage loyalty points" 
ON public.fan_loyalty 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Everyone can view trend metrics" 
ON public.trend_metrics 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage trend metrics" 
ON public.trend_metrics 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can react to content" 
ON public.content_reactions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view reactions" 
ON public.content_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can comment on content" 
ON public.content_comments 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view comments" 
ON public.content_comments 
FOR SELECT 
USING (true);

-- Add foreign key constraints
ALTER TABLE public.pricing_analytics 
ADD CONSTRAINT fk_pricing_analytics_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.creator_playlists 
ADD CONSTRAINT fk_creator_playlists_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.playlist_content 
ADD CONSTRAINT fk_playlist_content_playlist_id 
FOREIGN KEY (playlist_id) REFERENCES public.creator_playlists(id) ON DELETE CASCADE;

ALTER TABLE public.referral_codes 
ADD CONSTRAINT fk_referral_codes_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.fan_loyalty 
ADD CONSTRAINT fk_fan_loyalty_fan_id 
FOREIGN KEY (fan_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.fan_loyalty 
ADD CONSTRAINT fk_fan_loyalty_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trend_metrics 
ADD CONSTRAINT fk_trend_metrics_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.content_comments 
ADD CONSTRAINT fk_content_comments_parent_id 
FOREIGN KEY (parent_comment_id) REFERENCES public.content_comments(id) ON DELETE CASCADE;

-- Add update triggers
CREATE TRIGGER update_pricing_analytics_updated_at
BEFORE UPDATE ON public.pricing_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_playlists_updated_at
BEFORE UPDATE ON public.creator_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fan_loyalty_updated_at
BEFORE UPDATE ON public.fan_loyalty
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();