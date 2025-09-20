-- Insert seed data for creator content to populate the threads feed
-- First, let's check if we have any creators in the database and create some if needed

-- Insert some mock creators if they don't exist
INSERT INTO public.profiles (id, full_name, account_type, avatar_url, bio, created_at) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Kaion Wesley', 'creator', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'Comedy content creator and social media influencer', now()),
  ('22222222-2222-2222-2222-222222222222', 'Eutopus Viral', 'creator', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', 'Viral content specialist covering trending topics', now()),
  ('33333333-3333-3333-3333-333333333333', 'Sarah Johnson', 'creator', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'Lifestyle and fitness content creator', now()),
  ('44444444-4444-4444-4444-444444444444', 'Mike Chen', 'creator', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'Tech reviewer and gadget enthusiast', now()),
  ('55555555-5555-5555-5555-555555555555', 'Emma Rodriguez', 'creator', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', 'Food blogger and recipe developer', now())
ON CONFLICT (id) DO NOTHING;

-- Create social accounts for these creators
INSERT INTO public.social_accounts (id, user_id, platform, username, is_verified, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'threads', 'kaionwesley', true, now()),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'threads', 'eutopus.viral', true, now()),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'threads', 'sarahjohnson', false, now()),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'threads', 'mikechen', true, now()),
  ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'threads', 'emmaRodriguez', false, now())
ON CONFLICT (id) DO NOTHING;

-- Insert seed creator content
INSERT INTO public.creator_content (id, social_account_id, platform_post_id, title, description, content_type, media_url, thumbnail_url, view_count, like_count, comment_count, published_at, created_at, metadata)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'post_1',
    NULL,
    'lol my boy was talkin that big shit on the first video like he just had the keys to the kingdom',
    'video',
    'https://example.com/video1.mp4',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    1100,
    2100,
    649,
    now() - interval '15 hours',
    now() - interval '15 hours',
    '{"hashtags": ["comedy", "viral"], "mentions": []}'::jsonb
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'post_2',
    'Jimmy Kimmel pulled off of ABC indefinitely. Disney loses 3.87 billion dollars',
    'Insiders caution that no agreement is in sight but discussions continue as Kimmel weighs concerns about staff job losses if show ends',
    'text',
    NULL,
    'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=300&fit=crop',
    850,
    1200,
    335,
    now() - interval '48 minutes',
    now() - interval '48 minutes',
    '{"hashtags": ["news", "entertainment"], "mentions": []}'::jsonb
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'post_3',
    NULL,
    'Just finished my morning workout routine! 💪 Starting the day with some high-intensity cardio and strength training. Remember, consistency is key!',
    'image',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    420,
    892,
    156,
    now() - interval '2 hours',
    now() - interval '2 hours',
    '{"hashtags": ["fitness", "motivation"], "mentions": []}'::jsonb
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    'a4444444-4444-4444-4444-444444444444',
    'post_4',
    'Latest iPhone 15 Pro Max Review',
    'After using it for 2 weeks, here are my thoughts on Apple''s latest flagship. The camera improvements are actually significant this time.',
    'video',
    'https://example.com/iphone_review.mp4',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
    2800,
    1456,
    287,
    now() - interval '6 hours',
    now() - interval '6 hours',
    '{"hashtags": ["tech", "review", "iphone"], "mentions": []}'::jsonb
  ),
  (
    'c5555555-5555-5555-5555-555555555555',
    'a5555555-5555-5555-5555-555555555555',
    'post_5',
    NULL,
    'Tried making homemade pasta for the first time and it was actually easier than I thought! The key is getting the dough texture just right. Recipe in comments 👇',
    'image',
    'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
    680,
    1123,
    98,
    now() - interval '4 hours',
    now() - interval '4 hours',
    '{"hashtags": ["cooking", "homemade", "pasta"], "mentions": []}'::jsonb
  ),
  (
    'c6666666-6666-6666-6666-666666666666',
    'a1111111-1111-1111-1111-111111111111',
    'post_6',
    NULL,
    'When you realize you''ve been pronouncing "gif" wrong your entire life 😅',
    'text',
    NULL,
    NULL,
    1500,
    3200,
    890,
    now() - interval '1 day',
    now() - interval '1 day',
    '{"hashtags": ["relatable", "funny"], "mentions": []}'::jsonb
  );