-- SECURITY FIX: Require authentication for all profile access
-- This prevents anonymous visitors from accessing user profile information

-- Drop the current policy that allows public access
DROP POLICY IF EXISTS "Public can view profiles with privacy controls" ON public.profiles;

-- Create secure policy that requires authentication
CREATE POLICY "Authenticated users can view profiles with privacy controls" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  CASE 
    -- Users can always see their own profile completely
    WHEN auth.uid() = id THEN true
    -- For viewing others' profiles, check privacy settings
    ELSE (
      -- Check if privacy settings exist and allow public visibility
      EXISTS (
        SELECT 1 FROM profile_privacy_settings 
        WHERE user_id = profiles.id 
        AND profile_visibility = 'public'
      )
      -- OR if no privacy settings exist, allow basic visibility (backward compatibility)
      OR NOT EXISTS (
        SELECT 1 FROM profile_privacy_settings 
        WHERE user_id = profiles.id
      )
    )
  END
);

-- Ensure profiles table has proper RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create default privacy settings for existing users without settings
INSERT INTO public.profile_privacy_settings (user_id, show_full_name, show_bio, show_avatar, show_interests, profile_visibility)
SELECT 
  p.id,
  false, -- Default: don't show full name
  true,  -- Default: show bio
  true,  -- Default: show avatar  
  true,  -- Default: show interests
  'public' -- Default: public visibility
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_privacy_settings pps 
  WHERE pps.user_id = p.id
);