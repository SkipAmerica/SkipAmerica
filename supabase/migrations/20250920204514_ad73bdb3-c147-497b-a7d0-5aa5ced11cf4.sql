-- Insert sample profiles for creators
INSERT INTO public.profiles (id, full_name, bio, avatar_url, account_type, interests, created_at) VALUES
(gen_random_uuid(), 'Alex Chen', 'Tech entrepreneur and content creator sharing insights about startups and innovation', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'creator', ARRAY['technology', 'business', 'startups'], now()),
(gen_random_uuid(), 'Maya Rodriguez', 'Fashion and lifestyle influencer with a passion for sustainable living', 'https://images.unsplash.com/photo-1494790108755-2616b612b743?w=150&h=150&fit=crop&crop=face', 'creator', ARRAY['fashion', 'lifestyle', 'sustainability'], now()),
(gen_random_uuid(), 'Jordan Kim', 'Fitness coach and nutritionist helping people achieve their health goals', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'creator', ARRAY['fitness', 'health', 'nutrition'], now());

-- Create temporary variables to store the creator IDs for social accounts and content
DO $$
DECLARE
    alex_id uuid;
    maya_id uuid;
    jordan_id uuid;
    alex_social_id uuid;
    maya_social_id uuid;
    jordan_social_id uuid;
BEGIN
    -- Get the creator IDs
    SELECT id INTO alex_id FROM public.profiles WHERE full_name = 'Alex Chen' LIMIT 1;
    SELECT id INTO maya_id FROM public.profiles WHERE full_name = 'Maya Rodriguez' LIMIT 1;
    SELECT id INTO jordan_id FROM public.profiles WHERE full_name = 'Jordan Kim' LIMIT 1;
    
    -- Insert social accounts
    INSERT INTO public.social_accounts (id, user_id, platform, handle, verified, created_at) VALUES
    (gen_random_uuid(), alex_id, 'instagram', '@alexchen_tech', true, now()),
    (gen_random_uuid(), maya_id, 'instagram', '@maya_sustainable', true, now()),
    (gen_random_uuid(), jordan_id, 'tiktok', '@jordan_fitness', false, now());
    
    -- Get the social account IDs
    SELECT id INTO alex_social_id FROM public.social_accounts WHERE user_id = alex_id LIMIT 1;
    SELECT id INTO maya_social_id FROM public.social_accounts WHERE user_id = maya_id LIMIT 1;
    SELECT id INTO jordan_social_id FROM public.social_accounts WHERE user_id = jordan_id LIMIT 1;
    
    -- Insert sample creator content
    INSERT INTO public.creator_content (id, social_account_id, content_type, title, description, media_url, thumbnail_url, view_count, like_count, comment_count, published_at, created_at) VALUES
    (gen_random_uuid(), alex_social_id, 'image', 'Building the Future of Tech', 'Just launched our new AI-powered startup tool! Excited to share this journey with you all 🚀', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=200&h=150&fit=crop', 1250, 84, 12, now() - interval '2 hours', now() - interval '2 hours'),
    (gen_random_uuid(), maya_social_id, 'image', 'Sustainable Fashion Finds', 'Found these amazing eco-friendly pieces at a local thrift store. Sustainability never looked so good! 🌿✨', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=150&fit=crop', 890, 156, 23, now() - interval '4 hours', now() - interval '4 hours'),
    (gen_random_uuid(), jordan_social_id, 'video', 'Morning Workout Routine', 'Start your day strong with this 15-minute routine. No equipment needed! 💪', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=150&fit=crop', 2100, 245, 67, now() - interval '1 day', now() - interval '1 day'),
    (gen_random_uuid(), alex_social_id, 'text', 'Startup Lessons Learned', 'After 3 failed startups, here are the top 5 lessons that finally led to success. Thread 🧵', null, null, 456, 89, 34, now() - interval '6 hours', now() - interval '6 hours'),
    (gen_random_uuid(), maya_social_id, 'image', 'Zero Waste Kitchen', 'Transformed my kitchen into a zero-waste paradise. Small changes, big impact! 🌍', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=150&fit=crop', 1100, 178, 45, now() - interval '8 hours', now() - interval '8 hours'),
    (gen_random_uuid(), jordan_social_id, 'video', 'Quick Protein Smoothie', 'Perfect post-workout fuel in under 2 minutes. Recipe in comments! 🥤', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=150&fit=crop', 1800, 234, 89, now() - interval '12 hours', now() - interval '12 hours');
END $$;