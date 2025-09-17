-- Create enums for various types
CREATE TYPE celebrity_tier AS ENUM ('A', 'B', 'C', 'Rising', 'Local Hero');
CREATE TYPE verification_status AS ENUM ('government', 'press', 'platform', 'unverified');
CREATE TYPE offer_type AS ENUM ('live_1on1', 'live_group', 'ugc_video', 'social_post', 'story', 'appearance', 'panel', 'brand_collab');
CREATE TYPE platform_name AS ENUM ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'twitch', 'facebook', 'snapchat', 'pinterest');

-- Creators table (main entity)
CREATE TABLE public.creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    headline TEXT,
    bio TEXT,
    long_bio TEXT,
    avatar_url TEXT,
    location_country TEXT,
    location_city TEXT,
    location_coordinates POINT,
    languages TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    political_tags TEXT[] DEFAULT '{}',
    
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
    verification_status verification_status DEFAULT 'unverified',
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
    
    -- Constraints
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
    
    -- Unique constraint
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
    
    -- Constraints
    CONSTRAINT valid_offer_rate_range CHECK (max_rate >= min_rate),
    UNIQUE(creator_id, offer_type)
);

-- Press mentions table (only when press_opt_in is true)
CREATE TABLE public.press_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    outlet TEXT NOT NULL,
    headline TEXT NOT NULL,
    published_date DATE NOT NULL,
    article_url TEXT,
    sentiment_score DECIMAL(3,2) DEFAULT 0, -- -1 to 1
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint for headline length (data quality)
    CONSTRAINT valid_headline_length CHECK (LENGTH(headline) >= 5)
);

-- Compliance audit table
CREATE TABLE public.compliance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    source_system TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verifier_type TEXT NOT NULL, -- 'system' or 'admin'
    verifier_id UUID, -- admin user id if manual
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches (for future alerts)
CREATE TABLE public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    query_params JSONB NOT NULL,
    alert_frequency TEXT, -- 'none', 'daily', 'weekly'
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creators
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

-- RLS Policies for platform_stats
CREATE POLICY "Anyone can view visible platform stats" ON public.platform_stats
    FOR SELECT USING (
        is_visible AND 
        EXISTS (
            SELECT 1 FROM public.creators 
            WHERE creators.id = platform_stats.creator_id 
            AND NOT creators.is_suppressed
        )
    );

CREATE POLICY "Admins can manage platform stats" ON public.platform_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'industry_resource'
        )
    );

-- RLS Policies for offer_rates  
CREATE POLICY "Anyone can view active offer rates" ON public.offer_rates
    FOR SELECT USING (
        is_active AND 
        EXISTS (
            SELECT 1 FROM public.creators 
            WHERE creators.id = offer_rates.creator_id 
            AND NOT creators.is_suppressed
        )
    );

CREATE POLICY "Admins can manage offer rates" ON public.offer_rates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'industry_resource'
        )
    );

-- RLS Policies for press_mentions (only visible when creator has press_opt_in)
CREATE POLICY "Anyone can view press mentions for opted-in creators" ON public.press_mentions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creators 
            WHERE creators.id = press_mentions.creator_id 
            AND creators.press_opt_in = TRUE
            AND NOT creators.is_suppressed
        )
    );

CREATE POLICY "Admins can manage press mentions" ON public.press_mentions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'industry_resource'
        )
    );

-- RLS Policies for compliance_audit (admin only)
CREATE POLICY "Admins can view compliance audit" ON public.compliance_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'industry_resource'
        )
    );

CREATE POLICY "System can insert audit records" ON public.compliance_audit
    FOR INSERT WITH CHECK (verifier_type = 'system' OR verifier_id = auth.uid());

-- RLS Policies for saved_searches
CREATE POLICY "Users can manage their own saved searches" ON public.saved_searches
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_creators_full_text ON public.creators USING gin(
    to_tsvector('english', 
        COALESCE(full_name, '') || ' ' || 
        COALESCE(headline, '') || ' ' || 
        COALESCE(bio, '') || ' ' ||
        COALESCE(long_bio, '') || ' ' ||
        array_to_string(categories, ' ')
    )
);

CREATE INDEX idx_creators_location ON public.creators USING gist(location_coordinates);
CREATE INDEX idx_creators_celebrity_tier ON public.creators(celebrity_tier);
CREATE INDEX idx_creators_verification ON public.creators(verification_status);
CREATE INDEX idx_creators_categories ON public.creators USING gin(categories);
CREATE INDEX idx_creators_languages ON public.creators USING gin(languages);
CREATE INDEX idx_creators_country ON public.creators(location_country);
CREATE INDEX idx_creators_updated ON public.creators(updated_at DESC);
CREATE INDEX idx_creators_engagement ON public.creators(avg_engagement_rate DESC);
CREATE INDEX idx_creators_followers ON public.creators(total_followers DESC);

CREATE INDEX idx_platform_stats_creator ON public.platform_stats(creator_id);
CREATE INDEX idx_platform_stats_platform ON public.platform_stats(platform);
CREATE INDEX idx_platform_stats_followers ON public.platform_stats(follower_count DESC);

CREATE INDEX idx_offer_rates_creator ON public.offer_rates(creator_id);
CREATE INDEX idx_offer_rates_type ON public.offer_rates(offer_type);
CREATE INDEX idx_offer_rates_range ON public.offer_rates(min_rate, max_rate);

CREATE INDEX idx_press_mentions_creator ON public.press_mentions(creator_id);
CREATE INDEX idx_press_mentions_date ON public.press_mentions(published_date DESC);
CREATE INDEX idx_press_mentions_outlet ON public.press_mentions(outlet);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_stats_updated_at BEFORE UPDATE ON public.platform_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offer_rates_updated_at BEFORE UPDATE ON public.offer_rates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate celebrity tier
CREATE OR REPLACE FUNCTION public.calculate_celebrity_tier(
    total_followers BIGINT,
    press_mentions_30d INTEGER,
    verification_status verification_status
) RETURNS celebrity_tier AS $$
BEGIN
    -- A tier: followers >= 5M OR monthly press mentions >= 10 OR (verification in press/gov AND followers >= 2M)
    IF total_followers >= 5000000 OR 
       press_mentions_30d >= 10 OR 
       (verification_status IN ('government', 'press') AND total_followers >= 2000000) THEN
        RETURN 'A';
    END IF;
    
    -- B tier: 1M-5M followers
    IF total_followers >= 1000000 THEN
        RETURN 'B';
    END IF;
    
    -- C tier: 250k-1M followers  
    IF total_followers >= 250000 THEN
        RETURN 'C';
    END IF;
    
    -- Default to Rising
    RETURN 'Rising';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate profile completeness
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(creator_row public.creators) RETURNS INTEGER AS $$
DECLARE
    completeness INTEGER := 0;
    platform_count INTEGER;
    offer_count INTEGER;
BEGIN
    -- Avatar (15 points)
    IF creator_row.avatar_url IS NOT NULL AND creator_row.avatar_url != '' THEN
        completeness := completeness + 15;
    END IF;
    
    -- Headline (15 points)
    IF creator_row.headline IS NOT NULL AND LENGTH(creator_row.headline) >= 10 THEN
        completeness := completeness + 15;
    END IF;
    
    -- Bio (10 points)
    IF creator_row.bio IS NOT NULL AND LENGTH(creator_row.bio) >= 20 THEN
        completeness := completeness + 10;
    END IF;
    
    -- Long bio (10 points)
    IF creator_row.long_bio IS NOT NULL AND LENGTH(creator_row.long_bio) >= 100 THEN
        completeness := completeness + 10;
    END IF;
    
    -- Categories (15 points)
    IF array_length(creator_row.categories, 1) > 0 THEN
        completeness := completeness + 15;
    END IF;
    
    -- Location (10 points)
    IF creator_row.location_country IS NOT NULL THEN
        completeness := completeness + 10;
    END IF;
    
    -- Languages (5 points)
    IF array_length(creator_row.languages, 1) > 0 THEN
        completeness := completeness + 5;
    END IF;
    
    -- Platform stats (10 points if at least one)
    SELECT COUNT(*) INTO platform_count 
    FROM public.platform_stats 
    WHERE creator_id = creator_row.id AND is_visible = true;
    
    IF platform_count > 0 THEN
        completeness := completeness + 10;
    END IF;
    
    -- Offer rates (10 points if at least one)
    SELECT COUNT(*) INTO offer_count 
    FROM public.offer_rates 
    WHERE creator_id = creator_row.id AND is_active = true;
    
    IF offer_count > 0 THEN
        completeness := completeness + 10;
    END IF;
    
    RETURN completeness;
END;
$$ LANGUAGE plpgsql;

-- Function to update creator computed fields
CREATE OR REPLACE FUNCTION public.update_creator_computed_fields()
RETURNS TRIGGER AS $$
DECLARE
    total_followers_sum BIGINT;
    avg_engagement DECIMAL(5,2);
    press_count_30d INTEGER;
    press_count_total INTEGER;
BEGIN
    -- Calculate total followers across platforms
    SELECT COALESCE(SUM(follower_count), 0) INTO total_followers_sum
    FROM public.platform_stats 
    WHERE creator_id = NEW.id AND is_visible = true;
    
    -- Calculate average engagement rate
    SELECT COALESCE(AVG(engagement_rate_30d), 0) INTO avg_engagement
    FROM public.platform_stats 
    WHERE creator_id = NEW.id AND is_visible = true AND engagement_rate_30d > 0;
    
    -- Count press mentions (only if press_opt_in is true)
    IF NEW.press_opt_in THEN
        SELECT COUNT(*) INTO press_count_30d
        FROM public.press_mentions 
        WHERE creator_id = NEW.id AND published_date >= CURRENT_DATE - INTERVAL '30 days';
        
        SELECT COUNT(*) INTO press_count_total
        FROM public.press_mentions 
        WHERE creator_id = NEW.id;
    ELSE
        press_count_30d := 0;
        press_count_total := 0;
    END IF;
    
    -- Update computed fields
    NEW.total_followers := total_followers_sum;
    NEW.avg_engagement_rate := avg_engagement;
    NEW.press_mentions_30d := press_count_30d;
    NEW.press_mentions_total := press_count_total;
    NEW.celebrity_tier := public.calculate_celebrity_tier(
        total_followers_sum, 
        press_count_30d, 
        NEW.verification_status
    );
    NEW.profile_completeness := public.calculate_profile_completeness(NEW);
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update computed fields
CREATE TRIGGER update_creator_computed_fields BEFORE UPDATE ON public.creators
    FOR EACH ROW EXECUTE FUNCTION public.update_creator_computed_fields();