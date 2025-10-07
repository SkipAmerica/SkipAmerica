-- First, insert missing creator records for any existing creator profiles
INSERT INTO public.creators (
  id,
  full_name,
  avatar_url,
  profile_completeness
)
SELECT 
  p.id,
  COALESCE(p.full_name, 'Creator'),
  p.avatar_url,
  0
FROM public.profiles p
LEFT JOIN public.creators c ON c.id = p.id
WHERE p.account_type = 'creator'
  AND c.id IS NULL;

-- Add a comment to document this fix
COMMENT ON TABLE public.creators IS 'Creator profiles synced with profiles table. Missing records are backfilled by migration.';