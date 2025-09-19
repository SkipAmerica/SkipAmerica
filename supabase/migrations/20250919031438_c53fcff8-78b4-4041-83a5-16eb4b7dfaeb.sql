-- SECURITY FIX: Restrict creator personal information access to authenticated users only
-- This prevents anonymous visitors from accessing sensitive creator personal data

-- Drop the current policy that allows public access to all creator data
DROP POLICY IF EXISTS "Public can view basic creator profiles only" ON public.creators;

-- Create secure policy that requires authentication for viewing creator data
CREATE POLICY "Authenticated users can view creator profiles" 
ON public.creators 
FOR SELECT 
TO authenticated
USING (
  CASE 
    -- Creators can always see their own profile completely
    WHEN auth.uid() = id THEN true
    -- Industry resources (admins) can see all profiles
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'industry_resource'::account_type
    ) THEN true
    -- Other authenticated users can only see non-suppressed creator profiles
    ELSE NOT is_suppressed
  END
);

-- Ensure creators table has proper RLS enabled
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;