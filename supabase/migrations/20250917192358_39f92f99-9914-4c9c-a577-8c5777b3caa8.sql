-- Add interests column to profiles table to store user's selected interests
ALTER TABLE public.profiles 
ADD COLUMN interests text[] DEFAULT '{}';

-- Add a comment to explain the column
COMMENT ON COLUMN public.profiles.interests IS 'Array of interest categories selected by the user during sign-up';