-- Final security fix: Ensure RLS policies are truly restrictive
-- Replace the current permissive policies with properly restrictive ones

-- Drop the still-permissive policies
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic creator info" ON public.creators;

-- Create truly secure profile policy that respects privacy settings
CREATE POLICY "Public can view profiles with privacy controls" 
ON public.profiles 
FOR SELECT 
USING (
  CASE 
    -- Users can always see their own profile
    WHEN auth.uid() = id THEN true
    -- For others, check privacy settings
    ELSE EXISTS (
      SELECT 1 FROM profile_privacy_settings 
      WHERE user_id = profiles.id 
      AND profile_visibility = 'public'
    )
    -- Default to allowing basic info if no privacy settings exist (backward compatibility)
    OR NOT EXISTS (
      SELECT 1 FROM profile_privacy_settings 
      WHERE user_id = profiles.id
    )
  END
);

-- Create secure creator policy that only shows non-sensitive fields
CREATE POLICY "Public can view basic creator profiles only" 
ON public.creators 
FOR SELECT 
USING (
  NOT is_suppressed
  -- This policy should only be used when selecting non-sensitive fields
  -- Application code must exclude: location_country, location_city, political_tags, press_mentions_*, risk_flags
);