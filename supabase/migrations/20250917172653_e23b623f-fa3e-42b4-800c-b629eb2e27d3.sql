-- Create new enums 
DO $$ BEGIN
    CREATE TYPE celebrity_tier AS ENUM ('A', 'B', 'C', 'Rising', 'Local Hero');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE offer_type AS ENUM ('live_1on1', 'live_group', 'ugc_video', 'social_post', 'story', 'appearance', 'panel', 'brand_collab');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE platform_name AS ENUM ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'twitch', 'facebook', 'snapchat', 'pinterest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Creators table
CREATE TABLE public.creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    headline TEXT,
    bio TEXT,
    long_bio TEXT,
    avatar_url TEXT,
    location_country TEXT,
    location_city TEXT,
    categories TEXT[] DEFAULT '{}',
    political_tags TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    
    -- Privacy controls
    political_opt_in BOOLEAN DEFAULT FALSE,
    press_opt_in BOOLEAN DEFAULT FALSE,
    do_not_contact BOOLEAN DEFAULT FALSE,
    
    -- Base rate range
    base_rate_min DECIMAL(10,2) DEFAULT 0,
    base_rate_max DECIMAL(10,2) DEFAULT 0,
    base_rate_currency TEXT DEFAULT 'USD',
    
    -- Availability
    available_for_booking BOOLEAN DEFAULT TRUE,
    response_time_hours INTEGER DEFAULT 24,
    
    -- Computed fields
    celebrity_tier celebrity_tier DEFAULT 'Rising',
    verification_status verification_status DEFAULT 'pending',
    profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    
    -- Counters and scores
    total_followers BIGINT DEFAULT 0,
    avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
    press_mentions_30d INTEGER DEFAULT 0,
    press_mentions_total INTEGER DEFAULT 0,
    
    -- Risk and moderation
    risk_flags TEXT[] DEFAULT '{}',
    is_suppressed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_rate_range CHECK (base_rate_max >= base_rate_min)
);

-- Platform stats table
CREATE TABLE public.platform_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    platform platform_name NOT NULL,
    handle TEXT NOT NULL,
    follower_count INTEGER DEFAULT 0,
    views_30d BIGINT DEFAULT 0,
    engagement_rate_30d DECIMAL(5,2) DEFAULT 0,
    verified_on_platform BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_visible BOOLEAN DEFAULT TRUE,
    growth_rate_30d DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(creator_id, platform)
);

-- Offer rates table
CREATE TABLE public.offer_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    offer_type offer_type NOT NULL,
    min_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_offer_rate_range CHECK (max_rate >= min_rate),
    UNIQUE(creator_id, offer_type)
);

-- Press mentions table
CREATE TABLE public.press_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    outlet TEXT NOT NULL,
    headline TEXT NOT NULL,
    published_date DATE NOT NULL,
    article_url TEXT,
    sentiment_score DECIMAL(3,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_headline_length CHECK (LENGTH(headline) >= 5)
);

-- Enable RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view non-suppressed creators" ON public.creators
    FOR SELECT USING (NOT is_suppressed);

CREATE POLICY "Admins can do anything with creators" ON public.creators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'industry_resource'
        )
    );

CREATE POLICY "Anyone can view visible platform stats" ON public.platform_stats
    FOR SELECT USING (
        is_visible AND 
        EXISTS (
            SELECT 1 FROM public.creators 
            WHERE creators.id = platform_stats.creator_id 
            AND NOT creators.is_suppressed
        )
    );

CREATE POLICY "Anyone can view active offer rates" ON public.offer_rates
    FOR SELECT USING (
        is_active AND 
        EXISTS (
            SELECT 1 FROM public.creators 
            WHERE creators.id = offer_rates.creator_id 
            AND NOT creators.is_suppressed
        )
    );

CREATE POLICY "Anyone can view press mentions for opted-in creators" ON public.press_mentions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creators 
            WHERE creators.id = press_mentions.creator_id 
            AND creators.press_opt_in = TRUE
            AND NOT creators.is_suppressed
        )
    );

-- Basic indexes
CREATE INDEX idx_creators_celebrity_tier ON public.creators(celebrity_tier);
CREATE INDEX idx_creators_verification ON public.creators(verification_status);
CREATE INDEX idx_creators_categories ON public.creators USING gin(categories);
CREATE INDEX idx_creators_country ON public.creators(location_country);
CREATE INDEX idx_creators_engagement ON public.creators(avg_engagement_rate DESC);
CREATE INDEX idx_creators_followers ON public.creators(total_followers DESC);
CREATE INDEX idx_creators_name ON public.creators(full_name);

-- Insert seed data
INSERT INTO public.creators (
    full_name, headline, bio, long_bio, avatar_url, location_country, location_city,
    categories, languages, base_rate_min, base_rate_max, celebrity_tier, 
    verification_status, total_followers, avg_engagement_rate, press_opt_in, political_opt_in
) VALUES 
('Sarah Johnson', 'Beauty & Lifestyle Creator', 'Makeup tutorials and lifestyle content', 
 'Professional makeup artist with 5+ years creating beauty content across platforms. Specializing in everyday looks and skincare routines.',
 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400', 'United States', 'Los Angeles',
 ARRAY['beauty', 'lifestyle', 'skincare'], ARRAY['English'], 100.00, 500.00, 'B', 'verified', 2500000, 8.5, true, false),

('Marcus Chen', 'Tech Reviewer & Gaming Guru', 'Latest tech reviews and gaming content',
 'Full-time content creator covering cutting-edge technology, gaming hardware reviews, and live gaming streams.',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Canada', 'Toronto', 
 ARRAY['technology', 'gaming', 'reviews'], ARRAY['English', 'Mandarin'], 150.00, 800.00, 'A', 'verified', 8200000, 12.3, true, false),

('Isabella Rodriguez', 'Fitness & Nutrition Coach', 'Helping you achieve your fitness goals',
 'Certified personal trainer and nutritionist sharing workout routines, meal prep ideas, and motivation.',
 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Spain', 'Madrid',
 ARRAY['fitness', 'health', 'nutrition'], ARRAY['Spanish', 'English'], 80.00, 300.00, 'C', 'verified', 750000, 15.2, false, true),

('David Kim', 'Business & Finance Expert', 'Breaking down complex financial concepts', 
 'Former investment banker turned content creator, making finance accessible through educational content.',
 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'South Korea', 'Seoul',
 ARRAY['business', 'finance', 'education'], ARRAY['Korean', 'English'], 200.00, 1000.00, 'B', 'verified', 1800000, 6.8, true, false),

('Emma Thompson', 'Sustainable Living Advocate', 'Eco-friendly lifestyle tips and DIY projects',
 'Environmental activist creating content about sustainable living, zero waste, and eco-friendly products.',
 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'United Kingdom', 'London',
 ARRAY['sustainability', 'lifestyle', 'environment'], ARRAY['English'], 75.00, 250.00, 'Rising', 'verified', 420000, 11.7, true, true);