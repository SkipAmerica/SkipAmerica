-- Phase 1: Fix RLS Policies - Add explicit authenticated SELECT policy
-- This eliminates join permission mismatches between public and authenticated users

CREATE POLICY "Authenticated users can view all active posts" 
ON public.creator_content
FOR SELECT 
TO authenticated
USING (deleted_at IS NULL);

-- Optional: Document the policy change
COMMENT ON POLICY "Authenticated users can view all active posts" ON public.creator_content IS 
'Explicit policy for authenticated users to view non-deleted posts. Prevents RLS conflicts during joins with social_accounts and profiles tables.';