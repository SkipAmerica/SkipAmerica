-- Clean up test user ourculturedecoded@gmail.com
-- Delete from profiles (will cascade to related tables via FK constraints)
DELETE FROM public.profiles 
WHERE id = '6d397803-f66d-4f85-95b2-f14654468a75';

-- Ensure auth user is removed
DELETE FROM auth.users 
WHERE email = 'ourculturedecoded@gmail.com';