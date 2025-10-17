
-- Fix Sherrod account: Update onboarding and profile completeness
-- User ID: e2fca857-9bc3-419d-bb20-6f791d1a4a22

-- Recalculate and update onboarding progress to 100%
UPDATE creator_onboarding
SET 
  percent_complete = 100,
  search_unlocked = true,
  updated_at = now()
WHERE creator_id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';

-- Update creator profile completeness
-- Calculate based on filled fields:
-- full_name (✓), bio (✓), avatar_url (✓), categories (✓), headline (✓), username (✓)
-- Missing: base_rate, detailed long_bio, social connections
-- Reasonable completeness: 70%
UPDATE creators
SET 
  profile_completeness = 70,
  updated_at = now()
WHERE id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';

-- Ensure creator presence record exists
INSERT INTO creator_presence (creator_id, is_online, last_heartbeat, updated_at)
VALUES ('e2fca857-9bc3-419d-bb20-6f791d1a4a22', false, now(), now())
ON CONFLICT (creator_id) DO UPDATE
SET updated_at = now();
