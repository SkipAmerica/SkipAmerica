-- Add username fields to profiles and creators tables
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create reserved usernames table for celebrity/influencer protection
CREATE TABLE IF NOT EXISTS reserved_usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  reason TEXT NOT NULL,
  verification_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for fast lookups (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_username_lower ON creators (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_reserved_usernames_lookup ON reserved_usernames (LOWER(username));

-- Enable RLS on reserved_usernames
ALTER TABLE reserved_usernames ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read reserved names for validation
CREATE POLICY "Anyone can read reserved names"
ON reserved_usernames FOR SELECT
USING (true);

-- RLS: Only service role can manage reserved names
CREATE POLICY "Only service role can manage reserved names"
ON reserved_usernames FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Update creator_onboarding to track username completion
ALTER TABLE creator_onboarding 
ADD COLUMN IF NOT EXISTS has_username BOOLEAN DEFAULT false;

-- Update the onboarding progress calculation function
CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress(p_creator_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_percent integer := 0;
  v_has_photo boolean;
  v_has_display_name boolean;
  v_has_tagline boolean;
  v_has_username boolean;
  v_industries_count integer;
BEGIN
  SELECT has_photo, has_display_name, has_tagline, has_username, industries_count
  INTO v_has_photo, v_has_display_name, v_has_tagline, v_has_username, v_industries_count
  FROM creator_onboarding
  WHERE creator_id = p_creator_id;

  -- Calculate percentage based on weights
  IF v_has_photo THEN
    v_percent := v_percent + 25;
  END IF;

  IF v_has_display_name THEN
    v_percent := v_percent + 15;
  END IF;

  IF v_has_username THEN
    v_percent := v_percent + 20;
  END IF;

  IF v_has_tagline THEN
    v_percent := v_percent + 15;
  END IF;

  IF v_industries_count >= 1 THEN
    v_percent := v_percent + 25;
  END IF;

  RETURN v_percent;
END;
$function$;

-- Seed system reserved usernames
INSERT INTO reserved_usernames (username, display_name, reason, verification_required) VALUES
  ('admin', 'Admin', 'system', false),
  ('support', 'Support', 'system', false),
  ('help', 'Help', 'system', false),
  ('api', 'API', 'system', false),
  ('www', 'WWW', 'system', false),
  ('mail', 'Mail', 'system', false),
  ('ftp', 'FTP', 'system', false),
  ('root', 'Root', 'system', false),
  ('system', 'System', 'system', false),
  ('moderator', 'Moderator', 'system', false),
  ('skipamerica', 'Skip America', 'platform', false),
  ('skip', 'Skip', 'platform', false),
  ('creator', 'Creator', 'platform', false),
  ('fan', 'Fan', 'platform', false),
  ('agency', 'Agency', 'platform', false),
  ('official', 'Official', 'platform', false),
  ('verified', 'Verified', 'platform', false),
  ('staff', 'Staff', 'platform', false),
  ('team', 'Team', 'platform', false),
  ('news', 'News', 'platform', false),
  ('info', 'Info', 'platform', false),
  ('contact', 'Contact', 'platform', false),
  ('about', 'About', 'platform', false),
  ('terms', 'Terms', 'platform', false),
  ('privacy', 'Privacy', 'platform', false),
  ('settings', 'Settings', 'platform', false),
  ('profile', 'Profile', 'platform', false),
  ('account', 'Account', 'platform', false)
ON CONFLICT (username) DO NOTHING;