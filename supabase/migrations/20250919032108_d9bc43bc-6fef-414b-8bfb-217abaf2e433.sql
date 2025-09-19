-- CRITICAL SECURITY FIX: Restrict access to social media tokens and business data
-- This prevents unauthorized access to sensitive authentication tokens and business intelligence

-- 1. Fix social_accounts table - remove public access to tokens
DROP POLICY IF EXISTS "Everyone can view verified social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Public can view social accounts without tokens" ON public.social_accounts;

-- Create secure policy for viewing own social accounts (tokens only visible to owners)
CREATE POLICY "Users can view their own social accounts" 
ON public.social_accounts 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix ad_placements table - restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view ads targeted to them" ON public.ad_placements;

CREATE POLICY "Authenticated users can view targeted ads" 
ON public.ad_placements 
FOR SELECT 
TO authenticated
USING (
  target_user_id = auth.uid() OR 
  target_creator_id = auth.uid() OR 
  (target_user_id IS NULL AND target_creator_id IS NULL)
);

-- 3. Fix creator_call_pricing table - restrict to authenticated users
DROP POLICY IF EXISTS "Public can view basic pricing info" ON public.creator_call_pricing;

CREATE POLICY "Authenticated users can view active pricing" 
ON public.creator_call_pricing 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 4. Fix mock_creators table - restrict to authenticated users only
DROP POLICY IF EXISTS "Everyone can view mock creators" ON public.mock_creators;

CREATE POLICY "Authenticated users can view mock creators" 
ON public.mock_creators 
FOR SELECT 
TO authenticated
USING (true);

-- 5. Ensure all tables have RLS properly enabled
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_call_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_creators ENABLE ROW LEVEL SECURITY;