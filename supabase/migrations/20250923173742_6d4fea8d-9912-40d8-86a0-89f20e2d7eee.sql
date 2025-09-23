-- Add Sherrod's creator profile to mock_creators table
INSERT INTO public.mock_creators (
  id,
  full_name,
  bio,
  account_type,
  category,
  call_rate,
  avatar_url,
  rating,
  ratings_count,
  is_online,
  interests
) VALUES (
  'e2fca857-9bc3-419d-bb20-6f791d1a4a22',
  'Sherrod',
  'Creator and innovator ready to connect with fans and share insights.',
  'creator',
  'entrepreneur',
  150.00,
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  4.8,
  100,
  true,
  ARRAY['innovation', 'business', 'technology']
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  account_type = EXCLUDED.account_type,
  category = EXCLUDED.category,
  call_rate = EXCLUDED.call_rate,
  avatar_url = EXCLUDED.avatar_url,
  rating = EXCLUDED.rating,
  ratings_count = EXCLUDED.ratings_count,
  is_online = EXCLUDED.is_online,
  interests = EXCLUDED.interests;