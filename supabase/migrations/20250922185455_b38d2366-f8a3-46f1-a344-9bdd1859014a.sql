-- Create test fan profiles for queue testing
INSERT INTO public.profiles (id, full_name, account_type, avatar_url, created_at, updated_at) VALUES 
(gen_random_uuid(), 'Test Fan Alpha', 'fan', 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestAlpha', now(), now()),
(gen_random_uuid(), 'Test Fan Beta', 'fan', 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestBeta', now(), now()),
(gen_random_uuid(), 'Test Fan Gamma', 'fan', 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestGamma', now(), now());

-- Get the current authenticated user's ID and insert queue entries
-- We'll use the first creator in the creators table as a fallback for testing
WITH test_creator AS (
  SELECT id FROM public.creators LIMIT 1
),
test_fans AS (
  SELECT id, full_name, ROW_NUMBER() OVER (ORDER BY created_at) as rn 
  FROM public.profiles 
  WHERE full_name LIKE 'Test Fan%' 
  ORDER BY created_at 
  LIMIT 3
)
INSERT INTO public.call_queue (creator_id, fan_id, status, estimated_wait_minutes, joined_at, created_at)
SELECT 
  tc.id as creator_id,
  tf.id as fan_id,
  'waiting' as status,
  (tf.rn * 5) as estimated_wait_minutes, -- 5, 10, 15 minutes
  now() - interval '1 minute' * tf.rn as joined_at, -- Staggered join times
  now() as created_at
FROM test_creator tc
CROSS JOIN test_fans tf;