-- Add JR Issac to creators table with correct enum values
INSERT INTO public.creators (
  full_name,
  bio,
  long_bio,
  headline,
  avatar_url,
  categories,
  base_rate_min,
  base_rate_max,
  base_rate_currency,
  available_for_booking,
  verification_status,
  celebrity_tier,
  total_followers,
  avg_engagement_rate,
  location_city,
  location_country,
  languages,
  response_time_hours,
  profile_completeness,
  press_mentions_30d,
  press_mentions_total,
  press_opt_in,
  political_opt_in,
  is_suppressed,
  do_not_contact
) VALUES (
  'JR Issac',
  'Brooklyn-born creative entrepreneur, music producer, and lifestyle influencer. Known for authentic content about urban culture, entrepreneurship, and creative pursuits.',
  'JR Issac is a multifaceted creative entrepreneur from Brooklyn, NY, who has built a substantial following through his authentic approach to content creation and community building. With roots deeply planted in Brooklyn''s vibrant cultural scene, JR combines his passion for music production with his natural ability to connect with audiences across multiple platforms.

As a music producer, JR has worked with emerging artists in the hip-hop and R&B scenes, helping to shape the sound of the next generation. His production style blends classic Brooklyn influences with modern innovation, creating tracks that resonate with both longtime hip-hop heads and younger listeners.

Beyond music, JR has established himself as a lifestyle and entrepreneurship influencer, sharing insights about building creative businesses, navigating the music industry, and maintaining authenticity in the digital age. His content often features collaborations with other Brooklyn-based creators, local businesses, and emerging artists, showcasing the rich creative ecosystem of his hometown.

JR''s approach to content creation is deeply community-focused. He regularly hosts live sessions, Q&A''s about the music industry, and provides mentorship to aspiring producers and content creators. His authenticity and willingness to share both successes and struggles have earned him a loyal following who appreciate his genuine approach to social media.

When he''s not creating content or producing music, JR can be found exploring Brooklyn''s diverse neighborhoods, discovering new spots to feature in his content, and connecting with local artists and entrepreneurs. His deep knowledge of Brooklyn''s culture and history makes him a sought-after collaborator for brands looking to authentically connect with urban audiences.',
  'Brooklyn Music Producer & Creative Entrepreneur 🎵',
  '/src/assets/creators/jr-issac.jpg',
  ARRAY['Music', 'Lifestyle', 'Entrepreneurship', 'Hip-Hop Culture', 'Content Creation'],
  120,
  250,
  'USD',
  true,
  'verified',
  'B',
  125000,
  8.5,
  'Brooklyn',
  'United States',
  ARRAY['English', 'Spanish'],
  2,
  95,
  15,
  47,
  true,
  false,
  false,
  false
);

-- Store the creator ID for subsequent inserts
DO $$
DECLARE
    jr_creator_id uuid;
BEGIN
    -- Get the ID of the creator we just inserted
    SELECT id INTO jr_creator_id FROM public.creators WHERE full_name = 'JR Issac' ORDER BY created_at DESC LIMIT 1;

    -- Add platform stats for JR Issac
    INSERT INTO public.platform_stats (
      creator_id,
      platform,
      handle,
      follower_count,
      engagement_rate_30d,
      views_30d,
      verified_on_platform,
      growth_rate_30d,
      is_visible
    ) VALUES 
    (jr_creator_id, 'instagram', '@jrissacbk', 85000, 9.2, 1200000, true, 12.5, true),
    (jr_creator_id, 'tiktok', '@jrissacproducer', 67000, 11.8, 890000, false, 15.3, true),
    (jr_creator_id, 'youtube', 'JR Issac Official', 45000, 7.1, 650000, true, 8.9, true),
    (jr_creator_id, 'twitter', '@jrissacmusic', 23000, 6.4, 180000, true, 5.2, true);

    -- Add call pricing for JR Issac
    INSERT INTO public.creator_call_pricing (
      creator_id,
      duration_minutes,
      price_per_block,
      pricing_mode,
      is_active
    ) VALUES 
    (jr_creator_id, 15, 45.00, 'manual', true),
    (jr_creator_id, 30, 85.00, 'manual', true),
    (jr_creator_id, 60, 160.00, 'manual', true);

    -- Add availability for JR Issac (available most days)
    INSERT INTO public.creator_availability (
      creator_id,
      day_of_week,
      start_time,
      end_time,
      is_active
    ) VALUES 
    (jr_creator_id, 1, '10:00', '18:00', true), -- Monday
    (jr_creator_id, 2, '10:00', '18:00', true), -- Tuesday  
    (jr_creator_id, 3, '10:00', '18:00', true), -- Wednesday
    (jr_creator_id, 4, '10:00', '18:00', true), -- Thursday
    (jr_creator_id, 5, '12:00', '20:00', true), -- Friday
    (jr_creator_id, 6, '11:00', '17:00', true), -- Saturday
    (jr_creator_id, 0, '12:00', '16:00', true); -- Sunday

    -- Add offer rates for JR Issac
    INSERT INTO public.offer_rates (
      creator_id,
      offer_type,
      min_rate,
      max_rate,
      currency,
      notes,
      is_active
    ) VALUES 
    (jr_creator_id, 'live_1on1', 120.00, 250.00, 'USD', 'Music production consultation, career advice, creative collaboration discussions', true),
    (jr_creator_id, 'live_group', 80.00, 150.00, 'USD', 'Group sessions, workshops, industry insights', true),
    (jr_creator_id, 'brand_collab', 500.00, 2000.00, 'USD', 'Music production, content collaboration, brand partnerships', true);

    -- Add to mock_creators for immediate display
    INSERT INTO public.mock_creators (
      id,
      full_name,
      bio,
      avatar_url,
      account_type,
      category,
      interests,
      is_online,
      rating,
      ratings_count,
      call_rate
    ) VALUES (
      jr_creator_id,
      'JR Issac',
      'Brooklyn Music Producer & Creative Entrepreneur 🎵 | Hip-Hop Culture Expert',
      '/src/assets/creators/jr-issac.jpg',
      'creator',
      'Music',
      ARRAY['Music Production', 'Hip-Hop', 'Entrepreneurship', 'Brooklyn Culture', 'Content Creation'],
      true,
      4.9,
      127,
      185
    );
END $$;