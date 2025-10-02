-- Delete test user ourculturedecoded@gmail.com to allow fresh testing
-- This removes the user from both public.profiles and auth.users

-- Delete from public.profiles first
DELETE FROM public.profiles
WHERE id = '07910f1b-3147-402f-9d0e-f6426ef5aa46';

-- Delete from auth.users
DELETE FROM auth.users
WHERE email = 'ourculturedecoded@gmail.com';