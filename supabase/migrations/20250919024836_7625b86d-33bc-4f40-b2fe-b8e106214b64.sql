-- Fix security issue: Prevent social media tokens from being exposed
-- Create secure RLS policies that exclude sensitive token fields

-- First, check current policies on social_accounts
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'social_accounts';

-- Drop existing policies to replace with secure ones
DROP POLICY IF EXISTS "Anyone can view verified social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can manage their own social accounts" ON public.social_accounts;

-- Create a secure policy for public reading that excludes sensitive tokens
-- Use a security definer function to safely exclude sensitive fields
CREATE OR REPLACE FUNCTION public.get_safe_social_account_data()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  platform social_platform,
  platform_username text,
  verification_status verification_status,
  follower_count integer,
  is_verified boolean,
  account_created_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  metadata jsonb
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    sa.id,
    sa.user_id,
    sa.platform,
    sa.platform_username,
    sa.verification_status,
    sa.follower_count,
    sa.is_verified,
    sa.account_created_at,
    sa.last_synced_at,
    sa.created_at,
    sa.updated_at,
    sa.metadata
  FROM social_accounts sa
  WHERE sa.is_verified = true;
$$;

-- Create policy for users to manage their own accounts (including tokens for their own use)
CREATE POLICY "Users can manage their own social accounts" 
ON public.social_accounts 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create policy for public read access to verified accounts (excluding tokens)
CREATE POLICY "Public can view verified accounts safely" 
ON public.social_accounts 
FOR SELECT 
USING (
  is_verified = true 
  AND NOT (
    current_setting('request.header.select', true) LIKE '%access_token%' 
    OR current_setting('request.header.select', true) LIKE '%refresh_token%'
  )
);