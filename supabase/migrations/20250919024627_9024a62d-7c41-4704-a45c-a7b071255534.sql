-- Fix security issue: Prevent email harvesting from mock_user_follows table
-- Replace the overly permissive RLS policy with a secure one that only allows users to see their own follow relationships

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "Users can view their mock follows" ON public.mock_user_follows;

-- Create a secure policy that only allows users to see their own follow relationships
CREATE POLICY "Users can only view their own follows" 
ON public.mock_user_follows 
FOR SELECT 
USING (follower_email = auth.email());

-- Add a policy to allow users to manage their own follow relationships
CREATE POLICY "Users can manage their own follows" 
ON public.mock_user_follows 
FOR ALL 
USING (follower_email = auth.email()) 
WITH CHECK (follower_email = auth.email());