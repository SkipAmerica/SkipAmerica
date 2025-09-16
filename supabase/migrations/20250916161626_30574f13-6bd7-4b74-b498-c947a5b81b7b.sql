-- Add pricing mode to creator call pricing
ALTER TABLE creator_call_pricing 
ADD COLUMN pricing_mode text DEFAULT 'manual' CHECK (pricing_mode IN ('manual', 'market_rate'));

-- Create market analysis table to store AI-powered pricing data
CREATE TABLE creator_market_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_price_per_minute numeric NOT NULL,
  confidence_score numeric DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  competitor_analysis jsonb DEFAULT '[]'::jsonb,
  market_position text, -- 'premium', 'mid-tier', 'budget'
  pricing_factors jsonb DEFAULT '{}'::jsonb, -- stores various factors that influenced pricing
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(creator_id)
);

-- Enable RLS
ALTER TABLE creator_market_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators cannot view their own market analysis" 
ON creator_market_analysis 
FOR SELECT 
USING (false); -- Nobody can see market rates, not even creators

CREATE POLICY "System can manage market analysis" 
ON creator_market_analysis 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create call performance metrics table
CREATE TABLE call_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  total_calls integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  avg_call_duration numeric DEFAULT 0,
  caller_velocity numeric DEFAULT 0, -- calls per hour during active periods
  repeat_caller_rate numeric DEFAULT 0, -- percentage of repeat callers
  avg_wait_time numeric DEFAULT 0, -- average time callers wait
  conversion_rate numeric DEFAULT 0, -- percentage of profile views that become calls
  price_sensitivity_score numeric DEFAULT 0, -- how price changes affect demand
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE call_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can view their own performance metrics" 
ON call_performance_metrics 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "System can manage performance metrics" 
ON call_performance_metrics 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create social analysis table
CREATE TABLE creator_social_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  follower_count integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  avg_likes_per_post numeric DEFAULT 0,
  avg_comments_per_post numeric DEFAULT 0,
  posting_frequency numeric DEFAULT 0, -- posts per week
  audience_quality_score numeric DEFAULT 0, -- engagement vs follower ratio
  influence_score numeric DEFAULT 0, -- calculated influence metric
  verified_status boolean DEFAULT false,
  account_age_months integer DEFAULT 0,
  last_analyzed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(creator_id, platform)
);

-- Enable RLS
ALTER TABLE creator_social_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can view their own social analysis" 
ON creator_social_analysis 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "System can manage social analysis" 
ON creator_social_analysis 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create press coverage table
CREATE TABLE creator_press_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_url text NOT NULL,
  publication text,
  title text,
  published_date timestamp with time zone,
  sentiment_score numeric DEFAULT 0 CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  relevance_score numeric DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  impact_score numeric DEFAULT 0 CHECK (impact_score >= 0 AND impact_score <= 100),
  mentions_count integer DEFAULT 1,
  article_content text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(creator_id, article_url)
);

-- Enable RLS
ALTER TABLE creator_press_coverage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can view their own press coverage" 
ON creator_press_coverage 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "System can manage press coverage" 
ON creator_press_coverage 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger to update market analysis timestamp
CREATE OR REPLACE FUNCTION update_market_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_market_analysis_timestamp
  BEFORE UPDATE ON creator_market_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_market_analysis_timestamp();

-- Create indexes for better performance
CREATE INDEX idx_creator_market_analysis_creator_id ON creator_market_analysis(creator_id);
CREATE INDEX idx_call_performance_metrics_creator_id ON call_performance_metrics(creator_id);
CREATE INDEX idx_call_performance_metrics_period ON call_performance_metrics(period_start, period_end);
CREATE INDEX idx_creator_social_analysis_creator_id ON creator_social_analysis(creator_id);
CREATE INDEX idx_creator_social_analysis_platform ON creator_social_analysis(creator_id, platform);
CREATE INDEX idx_creator_press_coverage_creator_id ON creator_press_coverage(creator_id);
CREATE INDEX idx_creator_press_coverage_published ON creator_press_coverage(published_date DESC);