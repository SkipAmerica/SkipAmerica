-- Clean up all user accounts and related data

-- Delete from profiles table (this will cascade due to foreign key relationships)
DELETE FROM profiles;

-- Delete users from auth.users table 
-- This will cascade to all related tables due to foreign key constraints
DELETE FROM auth.users;