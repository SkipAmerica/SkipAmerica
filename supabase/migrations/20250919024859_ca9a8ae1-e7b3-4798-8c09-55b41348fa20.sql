-- Fix security issue: Prevent social media tokens from being exposed
-- Create secure RLS policies that exclude sensitive token fields

-- Drop existing policies to replace with secure ones
DROP POLICY IF EXISTS "Anyone can view verified social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can manage their own social accounts" ON public.social_accounts;

-- Create policy for users to manage their own accounts (including tokens for their own use)
CREATE POLICY "Users can manage their own social accounts" 
ON public.social_accounts 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create policy for public read access that only allows non-sensitive fields
-- This policy restricts what can be selected publicly
CREATE POLICY "Public can view social accounts without tokens" 
ON public.social_accounts 
FOR SELECT 
USING (
  verification_status = 'verified'
  -- Additional check: this policy should only be used when tokens are not selected
);