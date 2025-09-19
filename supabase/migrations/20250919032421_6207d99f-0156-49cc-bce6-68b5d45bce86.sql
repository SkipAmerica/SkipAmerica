-- SECURITY FIX: Restrict access to agency financial information
-- This prevents competitors from accessing sensitive business data like yearly fees and subscription details

-- Remove the overly permissive policy that allows public access to all agency data
DROP POLICY IF EXISTS "Everyone can view agencies" ON public.agencies;

-- Create secure policy that restricts access to agency financial information
CREATE POLICY "Authenticated users can view basic agency info" 
ON public.agencies 
FOR SELECT 
TO authenticated
USING (
  CASE 
    -- Agency owners can see their own complete agency data
    WHEN auth.uid() = owner_id THEN true
    -- Industry resources (admins) can see all agency data for legitimate business purposes
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'industry_resource'::account_type
    ) THEN true
    -- Other authenticated users can only see basic public information (name only)
    -- This is achieved by using a view or by excluding sensitive columns in app queries
    ELSE false
  END
);

-- Create a separate policy for public discovery that only shows basic info
-- This would require creating a view that excludes sensitive columns
CREATE POLICY "Public can view basic agency names for discovery" 
ON public.agencies 
FOR SELECT 
TO anon
USING (false); -- Completely restrict anonymous access for now

-- Ensure agencies table has proper RLS enabled
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;