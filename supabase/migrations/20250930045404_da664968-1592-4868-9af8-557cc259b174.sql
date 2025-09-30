-- Update profile and creator records for Sherrod
UPDATE profiles 
SET 
  bio = 'Skip Founder. It all makes sense now. G2G.',
  avatar_url = 'https://ytqkunjxhtjsbpdrwsjf.supabase.co/storage/v1/object/public/creator-files/avatars/sherrod-profile.png'
WHERE id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';

-- Create creator record if it doesn't exist
INSERT INTO creators (
  id,
  full_name,
  bio,
  avatar_url,
  verification_status,
  celebrity_tier,
  available_for_booking,
  is_online,
  profile_completeness
)
SELECT 
  p.id,
  p.full_name,
  'Skip Founder. It all makes sense now. G2G.',
  'https://ytqkunjxhtjsbpdrwsjf.supabase.co/storage/v1/object/public/creator-files/avatars/sherrod-profile.png',
  'pending'::verification_status,
  'Rising'::celebrity_tier,
  true,
  false,
  25
FROM profiles p
WHERE p.id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22'
  AND NOT EXISTS (SELECT 1 FROM creators WHERE id = p.id);

-- Update creator record if it already exists
UPDATE creators
SET 
  bio = 'Skip Founder. It all makes sense now. G2G.',
  avatar_url = 'https://ytqkunjxhtjsbpdrwsjf.supabase.co/storage/v1/object/public/creator-files/avatars/sherrod-profile.png',
  updated_at = now()
WHERE id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';

-- Create creator presence record if it doesn't exist
INSERT INTO creator_presence (creator_id, is_online, last_heartbeat)
VALUES ('e2fca857-9bc3-419d-bb20-6f791d1a4a22', false, now())
ON CONFLICT (creator_id) DO NOTHING;