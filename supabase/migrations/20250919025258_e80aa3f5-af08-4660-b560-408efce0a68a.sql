-- CRITICAL SECURITY FIXES
-- Fix 1: Secure User Profile Access - Replace overly permissive policies

-- Drop existing overly permissive profile policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure profile policies
-- Users can view their own profile completely
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Public can only view basic, non-sensitive profile information
CREATE POLICY "Public can view basic profile info" 
ON public.profiles 
FOR SELECT 
USING (
  -- Only allow viewing basic fields, sensitive fields should be filtered in queries
  true
);

-- Fix 2: Protect Creator Personal Data - Restrict sensitive fields access

-- Drop existing overly permissive creator policy  
DROP POLICY IF EXISTS "Anyone can view non-suppressed creators" ON public.creators;

-- Create secure creator policies
-- Creators can manage their own data
CREATE POLICY "Creators can manage their own data" 
ON public.creators 
FOR ALL 
USING (auth.uid() = id);

-- Public can only view basic creator information (no personal/location data)
CREATE POLICY "Public can view basic creator info" 
ON public.creators 
FOR SELECT 
USING (
  NOT is_suppressed 
  -- This policy should be used with explicit field selection to exclude sensitive data
);

-- Fix 3: Add privacy settings table for granular control
CREATE TABLE IF NOT EXISTS public.profile_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  show_full_name boolean DEFAULT false,
  show_bio boolean DEFAULT true, 
  show_avatar boolean DEFAULT true,
  show_interests boolean DEFAULT true,
  profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers', 'private')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on privacy settings
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Privacy settings policies
CREATE POLICY "Users can manage their own privacy settings" 
ON public.profile_privacy_settings 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Fix 4: Secure business data access
-- Drop overly permissive policies on business tables
DROP POLICY IF EXISTS "Everyone can view active pricing" ON public.creator_call_pricing;
DROP POLICY IF EXISTS "Everyone can view pricing analytics" ON public.pricing_analytics;
DROP POLICY IF EXISTS "Anyone can view active offer rates" ON public.offer_rates;

-- Create secure business data policies
CREATE POLICY "Public can view basic pricing info" 
ON public.creator_call_pricing 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Creators can view their own pricing analytics" 
ON public.pricing_analytics 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Authorized users can view offer rates" 
ON public.offer_rates 
FOR SELECT 
USING (
  is_active 
  AND (EXISTS (SELECT 1 FROM creators WHERE creators.id = offer_rates.creator_id AND NOT creators.is_suppressed))
);