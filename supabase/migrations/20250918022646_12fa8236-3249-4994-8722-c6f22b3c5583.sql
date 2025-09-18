-- Create following relationships table
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create policies for following
CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can view their follows" 
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Insert 100 mock profiles (50 creators, 50 users)
INSERT INTO public.profiles (id, full_name, account_type, bio, avatar_url, interests) VALUES
-- Beauty Creators (25)
(gen_random_uuid(), 'Sophia Beauty', 'creator', 'Makeup artist specializing in bridal looks', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Isabella Glam', 'creator', 'Celebrity makeup artist and beauty influencer', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Olivia Luxe', 'creator', 'Luxury skincare specialist', 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Ava Radiance', 'creator', 'Natural beauty expert', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', ARRAY['beauty', 'natural']),
(gen_random_uuid(), 'Mia Shimmer', 'creator', 'Bold makeup looks specialist', 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Charlotte Rose', 'creator', 'Anti-aging skincare expert', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Amelia Grace', 'creator', 'Wedding makeup specialist', 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Harper Bloom', 'creator', 'K-beauty skincare guru', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Evelyn Chic', 'creator', 'Professional makeup artist', 'https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Abigail Belle', 'creator', 'Color analysis expert', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', ARRAY['beauty', 'color']),
(gen_random_uuid(), 'Emily Glow', 'creator', 'Holistic beauty consultant', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', ARRAY['beauty', 'natural']),
(gen_random_uuid(), 'Elizabeth Shine', 'creator', 'Bridal beauty specialist', 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150', ARRAY['beauty', 'bridal']),
(gen_random_uuid(), 'Mila Star', 'creator', 'Editorial makeup artist', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150', ARRAY['beauty', 'editorial']),
(gen_random_uuid(), 'Ella Divine', 'creator', 'Luxury beauty consultant', 'https://images.unsplash.com/photo-1541216970279-affbfdd55aa8?w=150', ARRAY['beauty', 'luxury']),
(gen_random_uuid(), 'Avery Moon', 'creator', 'Teenage beauty expert', 'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150', ARRAY['beauty', 'teen']),
(gen_random_uuid(), 'Sofia Storm', 'creator', 'Dramatic makeup specialist', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', ARRAY['beauty', 'dramatic']),
(gen_random_uuid(), 'Camila Velvet', 'creator', 'Vintage beauty expert', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', ARRAY['beauty', 'vintage']),
(gen_random_uuid(), 'Aria Frost', 'creator', 'Cool-toned makeup artist', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=150', ARRAY['beauty', 'cool']),
(gen_random_uuid(), 'Scarlett Blaze', 'creator', 'Bold color specialist', 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=150', ARRAY['beauty', 'bold']),
(gen_random_uuid(), 'Luna Pearl', 'creator', 'Minimalist beauty guru', 'https://images.unsplash.com/photo-1607346256330-dee7a0026c9b?w=150', ARRAY['beauty', 'minimal']),
(gen_random_uuid(), 'Zoe Crystal', 'creator', 'Skincare routine specialist', 'https://images.unsplash.com/photo-1618835962148-cf177563c6c0?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Layla Rose', 'creator', 'Romantic makeup artist', 'https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=150', ARRAY['beauty', 'romantic']),
(gen_random_uuid(), 'Nora Sage', 'creator', 'Organic beauty expert', 'https://images.unsplash.com/photo-1621784563330-caee0b138391?w=150', ARRAY['beauty', 'organic']),
(gen_random_uuid(), 'Hazel Gold', 'creator', 'Luxury skincare consultant', 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?w=150', ARRAY['beauty', 'luxury']),
(gen_random_uuid(), 'Violet Dream', 'creator', 'Fantasy makeup artist', 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?w=150', ARRAY['beauty', 'fantasy']),

-- Lifestyle/Wellness Creators (25)
(gen_random_uuid(), 'Marcus Johnson', 'creator', 'Fitness and wellness coach', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['fitness', 'wellness']),
(gen_random_uuid(), 'Alex Chen', 'creator', 'Tech entrepreneur and productivity guru', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['technology', 'productivity']),
(gen_random_uuid(), 'Jordan Blake', 'creator', 'Lifestyle and fashion influencer', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', ARRAY['fashion', 'lifestyle']),
(gen_random_uuid(), 'Ryan Cooper', 'creator', 'Travel and adventure guide', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', ARRAY['travel', 'adventure']),
(gen_random_uuid(), 'Tyler Stone', 'creator', 'Business and entrepreneurship mentor', 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150', ARRAY['business', 'entrepreneurship']),
(gen_random_uuid(), 'Blake Rivers', 'creator', 'Outdoor adventure specialist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', ARRAY['outdoor', 'adventure']),
(gen_random_uuid(), 'Cameron Storm', 'creator', 'Mental health and mindfulness coach', 'https://images.unsplash.com/photo-1558222218-b7b54eede3f3?w=150', ARRAY['wellness', 'mindfulness']),
(gen_random_uuid(), 'Hayden Cross', 'creator', 'Photography and creative arts', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150', ARRAY['photography', 'arts']),
(gen_random_uuid(), 'Jamie Fox', 'creator', 'Music production and audio engineering', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', ARRAY['music', 'audio']),
(gen_random_uuid(), 'Quinn Taylor', 'creator', 'Fashion styling and wardrobe consulting', 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150', ARRAY['fashion', 'styling']),
(gen_random_uuid(), 'Sage Mitchell', 'creator', 'Plant-based nutrition specialist', 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150', ARRAY['nutrition', 'vegan']),
(gen_random_uuid(), 'Phoenix Reed', 'creator', 'Yoga and meditation instructor', 'https://images.unsplash.com/photo-1559582930-2f26d2650d2f?w=150', ARRAY['yoga', 'meditation']),
(gen_random_uuid(), 'River Knight', 'creator', 'Sustainable living advocate', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150', ARRAY['sustainability', 'eco']),
(gen_random_uuid(), 'Skylar Dawn', 'creator', 'Creative writing and storytelling', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', ARRAY['writing', 'storytelling']),
(gen_random_uuid(), 'Rowan Sage', 'creator', 'Holistic health practitioner', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', ARRAY['health', 'holistic']),
(gen_random_uuid(), 'Aspen Gray', 'creator', 'Interior design consultant', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=150', ARRAY['design', 'interior']),
(gen_random_uuid(), 'Onyx Blue', 'creator', 'Digital marketing strategist', 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=150', ARRAY['marketing', 'digital']),
(gen_random_uuid(), 'Cedar Stone', 'creator', 'Woodworking and craftsmanship', 'https://images.unsplash.com/photo-1607346256330-dee7a0026c9b?w=150', ARRAY['crafts', 'woodworking']),
(gen_random_uuid(), 'Ocean Wilde', 'creator', 'Marine conservation educator', 'https://images.unsplash.com/photo-1618835962148-cf177563c6c0?w=150', ARRAY['conservation', 'marine']),
(gen_random_uuid(), 'Storm Knight', 'creator', 'Extreme sports athlete', 'https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=150', ARRAY['sports', 'extreme']),
(gen_random_uuid(), 'Atlas Cross', 'creator', 'Strength training coach', 'https://images.unsplash.com/photo-1621784563330-caee0b138391?w=150', ARRAY['fitness', 'strength']),
(gen_random_uuid(), 'Zephyr Moon', 'creator', 'Astrology and spiritual guidance', 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?w=150', ARRAY['spirituality', 'astrology']),
(gen_random_uuid(), 'Orion Blaze', 'creator', 'Adventure photography specialist', 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?w=150', ARRAY['photography', 'adventure']),
(gen_random_uuid(), 'Nova Storm', 'creator', 'Urban exploration guide', 'https://images.unsplash.com/photo-1631947430066-48c30d57b943?w=150', ARRAY['urban', 'exploration']),
(gen_random_uuid(), 'Kai Rivers', 'creator', 'Surfing and ocean sports', 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150', ARRAY['surfing', 'ocean']),

-- Regular Users (50)
(gen_random_uuid(), 'Sarah Johnson', 'fan', 'Beauty enthusiast and makeup lover', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Jessica Williams', 'fan', 'Skincare addict and wellness seeker', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Amanda Davis', 'fan', 'Fashion and beauty blogger', 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', ARRAY['beauty', 'fashion']),
(gen_random_uuid(), 'Rachel Miller', 'fan', 'Natural beauty enthusiast', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', ARRAY['beauty', 'natural']),
(gen_random_uuid(), 'Lauren Wilson', 'fan', 'Makeup collection enthusiast', 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Natalie Moore', 'fan', 'Anti-aging skincare researcher', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Ashley Taylor', 'fan', 'Bridal beauty planning', 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=150', ARRAY['beauty', 'bridal']),
(gen_random_uuid(), 'Michelle Anderson', 'fan', 'K-beauty skincare fan', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Jennifer Thomas', 'fan', 'Professional makeup learner', 'https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?w=150', ARRAY['beauty', 'makeup']),
(gen_random_uuid(), 'Stephanie Jackson', 'fan', 'Color analysis student', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', ARRAY['beauty', 'color']),
(gen_random_uuid(), 'Danielle White', 'fan', 'Holistic beauty seeker', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', ARRAY['beauty', 'natural']),
(gen_random_uuid(), 'Brittany Harris', 'fan', 'Wedding beauty planning', 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150', ARRAY['beauty', 'bridal']),
(gen_random_uuid(), 'Samantha Martin', 'fan', 'Editorial makeup fan', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150', ARRAY['beauty', 'editorial']),
(gen_random_uuid(), 'Nicole Garcia', 'fan', 'Luxury beauty collector', 'https://images.unsplash.com/photo-1541216970279-affbfdd55aa8?w=150', ARRAY['beauty', 'luxury']),
(gen_random_uuid(), 'Crystal Rodriguez', 'fan', 'Teen beauty explorer', 'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150', ARRAY['beauty', 'teen']),
(gen_random_uuid(), 'Vanessa Lewis', 'fan', 'Dramatic makeup lover', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', ARRAY['beauty', 'dramatic']),
(gen_random_uuid(), 'Angela Lee', 'fan', 'Vintage beauty enthusiast', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', ARRAY['beauty', 'vintage']),
(gen_random_uuid(), 'Maria Walker', 'fan', 'Cool-toned makeup fan', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=150', ARRAY['beauty', 'cool']),
(gen_random_uuid(), 'Diana Hall', 'fan', 'Bold color experimenter', 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=150', ARRAY['beauty', 'bold']),
(gen_random_uuid(), 'Lisa Allen', 'fan', 'Minimalist beauty advocate', 'https://images.unsplash.com/photo-1607346256330-dee7a0026c9b?w=150', ARRAY['beauty', 'minimal']),
(gen_random_uuid(), 'Karen Young', 'fan', 'Skincare routine perfectionist', 'https://images.unsplash.com/photo-1618835962148-cf177563c6c0?w=150', ARRAY['beauty', 'skincare']),
(gen_random_uuid(), 'Sandra Hernandez', 'fan', 'Romantic makeup lover', 'https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=150', ARRAY['beauty', 'romantic']),
(gen_random_uuid(), 'Donna King', 'fan', 'Organic beauty researcher', 'https://images.unsplash.com/photo-1621784563330-caee0b138391?w=150', ARRAY['beauty', 'organic']),
(gen_random_uuid(), 'Carol Wright', 'fan', 'Luxury skincare investor', 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?w=150', ARRAY['beauty', 'luxury']),
(gen_random_uuid(), 'Ruth Lopez', 'fan', 'Fantasy makeup hobbyist', 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?w=150', ARRAY['beauty', 'fantasy']),
(gen_random_uuid(), 'Sharon Hill', 'fan', 'Fitness and beauty balance', 'https://images.unsplash.com/photo-1631947430066-48c30d57b943?w=150', ARRAY['fitness', 'beauty']),
(gen_random_uuid(), 'Deborah Green', 'fan', 'Tech-savvy beauty tracker', 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150', ARRAY['technology', 'beauty']),
(gen_random_uuid(), 'Helen Adams', 'fan', 'Fashion and beauty integration', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=150', ARRAY['fashion', 'beauty']),
(gen_random_uuid(), 'Barbara Baker', 'fan', 'Travel beauty essentials', 'https://images.unsplash.com/photo-1637858868799-7f26a0640eb6?w=150', ARRAY['travel', 'beauty']),
(gen_random_uuid(), 'Patricia Gonzalez', 'fan', 'Business professional beauty', 'https://images.unsplash.com/photo-1639149888905-fb39731f2e6c?w=150', ARRAY['business', 'beauty']),
(gen_random_uuid(), 'Linda Nelson', 'fan', 'Outdoor beauty enthusiast', 'https://images.unsplash.com/photo-1640960543409-dbe56ccc30e2?w=150', ARRAY['outdoor', 'beauty']),
(gen_random_uuid(), 'Elizabeth Carter', 'fan', 'Wellness and beauty harmony', 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=150', ARRAY['wellness', 'beauty']),
(gen_random_uuid(), 'Susan Mitchell', 'fan', 'Creative beauty photographer', 'https://images.unsplash.com/photo-1644982647869-a6e9c8e9b4bd?w=150', ARRAY['photography', 'beauty']),
(gen_random_uuid(), 'Margaret Perez', 'fan', 'Music and beauty lifestyle', 'https://images.unsplash.com/photo-1646776877229-7d36eacb804f?w=150', ARRAY['music', 'beauty']),
(gen_random_uuid(), 'Dorothy Roberts', 'fan', 'Fashion styling student', 'https://images.unsplash.com/photo-1648737154547-b0dfd281c51e?w=150', ARRAY['fashion', 'styling']),
(gen_random_uuid(), 'Betty Turner', 'fan', 'Plant-based beauty seeker', 'https://images.unsplash.com/photo-1650170496638-b05030a94005?w=150', ARRAY['vegan', 'beauty']),
(gen_random_uuid(), 'Nancy Phillips', 'fan', 'Yoga and beauty balance', 'https://images.unsplash.com/photo-1651374996036-e7f89b59c85a?w=150', ARRAY['yoga', 'beauty']),
(gen_random_uuid(), 'Karen Campbell', 'fan', 'Sustainable beauty advocate', 'https://images.unsplash.com/photo-1653149902944-efd48b6ec5d5?w=150', ARRAY['sustainability', 'beauty']),
(gen_random_uuid(), 'Lisa Parker', 'fan', 'Creative beauty writer', 'https://images.unsplash.com/photo-1654967200147-c6cd60d7e3a7?w=150', ARRAY['writing', 'beauty']),
(gen_random_uuid(), 'Donna Evans', 'fan', 'Holistic beauty practitioner', 'https://images.unsplash.com/photo-1656072565829-2f4d7d3c5b3f?w=150', ARRAY['holistic', 'beauty']),
(gen_random_uuid(), 'Carol Edwards', 'fan', 'Interior beauty design', 'https://images.unsplash.com/photo-1657583065640-25d06de8b0f2?w=150', ARRAY['design', 'beauty']),
(gen_random_uuid(), 'Ruth Collins', 'fan', 'Digital beauty marketing', 'https://images.unsplash.com/photo-1658983506651-d0b8c9e8b3a4?w=150', ARRAY['marketing', 'beauty']),
(gen_random_uuid(), 'Sharon Stewart', 'fan', 'Beauty craft enthusiast', 'https://images.unsplash.com/photo-1659895365080-9d59db71e2e5?w=150', ARRAY['crafts', 'beauty']),
(gen_random_uuid(), 'Michelle Sanchez', 'fan', 'Environmental beauty advocate', 'https://images.unsplash.com/photo-1660787850582-ed1a8c16f49c?w=150', ARRAY['environment', 'beauty']),
(gen_random_uuid(), 'Laura Morris', 'fan', 'Athletic beauty enthusiast', 'https://images.unsplash.com/photo-1661893412157-5e1b8b55f9d6?w=150', ARRAY['sports', 'beauty']),
(gen_random_uuid(), 'Sarah Rogers', 'fan', 'Strong beauty advocate', 'https://images.unsplash.com/photo-1662399069041-2a4d9e2b4a17?w=150', ARRAY['strength', 'beauty']),
(gen_random_uuid(), 'Kimberly Reed', 'fan', 'Spiritual beauty seeker', 'https://images.unsplash.com/photo-1663248777525-8e13b5afef4e?w=150', ARRAY['spirituality', 'beauty']),
(gen_random_uuid(), 'Deborah Cook', 'fan', 'Adventure beauty blogger', 'https://images.unsplash.com/photo-1664102639014-0f91b78e0b36?w=150', ARRAY['adventure', 'beauty']),
(gen_random_uuid(), 'Jennifer Bailey', 'fan', 'Urban beauty explorer', 'https://images.unsplash.com/photo-1664956448259-a3fe3d03f5a8?w=150', ARRAY['urban', 'beauty']),
(gen_random_uuid(), 'Lisa Rivera', 'fan', 'Ocean beauty enthusiast', 'https://images.unsplash.com/photo-1665637808988-4f5a3d6c0b9e?w=150', ARRAY['ocean', 'beauty']);

-- Create some sample follows for the user Sherrod.shackelford@gmail.com
-- We'll use a function to get the user ID and then insert follows

DO $$
DECLARE
    user_id_var UUID;
    creator_ids UUID[];
    i INTEGER;
BEGIN
    -- Get the user ID for sherrod.shackelford@gmail.com
    SELECT id INTO user_id_var FROM auth.users WHERE email = 'sherrod.shackelford@gmail.com';
    
    -- Only proceed if user exists
    IF user_id_var IS NOT NULL THEN
        -- Get 30 random creator profile IDs
        SELECT ARRAY(
            SELECT id FROM public.profiles 
            WHERE account_type = 'creator' 
            ORDER BY RANDOM() 
            LIMIT 30
        ) INTO creator_ids;
        
        -- Insert follow relationships
        FOR i IN 1..30 LOOP
            IF i <= array_length(creator_ids, 1) THEN
                INSERT INTO public.user_follows (follower_id, following_id) 
                VALUES (user_id_var, creator_ids[i])
                ON CONFLICT (follower_id, following_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
END $$;