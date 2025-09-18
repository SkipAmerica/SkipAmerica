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

-- Create a mock_creators table for the demo creators that don't need auth
CREATE TABLE public.mock_creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'creator',
  bio TEXT,
  avatar_url TEXT,
  interests TEXT[],
  is_online BOOLEAN DEFAULT false,
  category TEXT,
  rating NUMERIC DEFAULT 4.8,
  ratings_count INTEGER DEFAULT 100,
  call_rate NUMERIC DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mock_creators ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view mock creators
CREATE POLICY "Everyone can view mock creators" 
ON public.mock_creators 
FOR SELECT 
USING (true);

-- Insert 100 mock creators across beauty and lifestyle categories
INSERT INTO public.mock_creators (full_name, bio, avatar_url, interests, is_online, category, rating, ratings_count, call_rate) VALUES
-- Beauty Creators (25)
('Sophia Beauty', 'Makeup artist specializing in bridal looks', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', ARRAY['beauty', 'makeup'], true, 'beauty', 4.9, 1250, 180),
('Isabella Glam', 'Celebrity makeup artist and beauty influencer', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', ARRAY['beauty', 'skincare'], false, 'beauty', 4.8, 890, 200),
('Olivia Luxe', 'Luxury skincare specialist', 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', ARRAY['beauty', 'skincare'], true, 'beauty', 4.7, 650, 220),
('Ava Radiance', 'Natural beauty expert', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', ARRAY['beauty', 'natural'], true, 'beauty', 4.9, 1100, 160),
('Mia Shimmer', 'Bold makeup looks specialist', 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=150', ARRAY['beauty', 'makeup'], false, 'beauty', 4.6, 420, 150),
('Charlotte Rose', 'Anti-aging skincare expert', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', ARRAY['beauty', 'skincare'], true, 'beauty', 4.8, 780, 210),
('Amelia Grace', 'Wedding makeup specialist', 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=150', ARRAY['beauty', 'makeup'], false, 'beauty', 4.9, 950, 190),
('Harper Bloom', 'K-beauty skincare guru', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150', ARRAY['beauty', 'skincare'], true, 'beauty', 4.7, 560, 170),
('Evelyn Chic', 'Professional makeup artist', 'https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?w=150', ARRAY['beauty', 'makeup'], true, 'beauty', 4.8, 1200, 185),
('Abigail Belle', 'Color analysis expert', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', ARRAY['beauty', 'color'], false, 'beauty', 4.9, 330, 250),
('Emily Glow', 'Holistic beauty consultant', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', ARRAY['beauty', 'natural'], true, 'beauty', 4.6, 440, 140),
('Elizabeth Shine', 'Bridal beauty specialist', 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150', ARRAY['beauty', 'bridal'], false, 'beauty', 4.8, 680, 200),
('Mila Star', 'Editorial makeup artist', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150', ARRAY['beauty', 'editorial'], true, 'beauty', 4.9, 810, 300),
('Ella Divine', 'Luxury beauty consultant', 'https://images.unsplash.com/photo-1541216970279-affbfdd55aa8?w=150', ARRAY['beauty', 'luxury'], false, 'beauty', 4.7, 520, 280),
('Avery Moon', 'Teenage beauty expert', 'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150', ARRAY['beauty', 'teen'], true, 'beauty', 4.8, 990, 120),
('Sofia Storm', 'Dramatic makeup specialist', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', ARRAY['beauty', 'dramatic'], true, 'beauty', 4.9, 750, 240),
('Camila Velvet', 'Vintage beauty expert', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', ARRAY['beauty', 'vintage'], false, 'beauty', 4.6, 380, 160),
('Aria Frost', 'Cool-toned makeup artist', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=150', ARRAY['beauty', 'cool'], true, 'beauty', 4.8, 620, 175),
('Scarlett Blaze', 'Bold color specialist', 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=150', ARRAY['beauty', 'bold'], false, 'beauty', 4.9, 850, 210),
('Luna Pearl', 'Minimalist beauty guru', 'https://images.unsplash.com/photo-1607346256330-dee7a0026c9b?w=150', ARRAY['beauty', 'minimal'], true, 'beauty', 4.7, 460, 140),
('Zoe Crystal', 'Skincare routine specialist', 'https://images.unsplash.com/photo-1618835962148-cf177563c6c0?w=150', ARRAY['beauty', 'skincare'], true, 'beauty', 4.8, 720, 190),
('Layla Rose', 'Romantic makeup artist', 'https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=150', ARRAY['beauty', 'romantic'], false, 'beauty', 4.9, 630, 180),
('Nora Sage', 'Organic beauty expert', 'https://images.unsplash.com/photo-1621784563330-caee0b138391?w=150', ARRAY['beauty', 'organic'], true, 'beauty', 4.6, 340, 155),
('Hazel Gold', 'Luxury skincare consultant', 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?w=150', ARRAY['beauty', 'luxury'], false, 'beauty', 4.8, 590, 260),
('Violet Dream', 'Fantasy makeup artist', 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?w=150', ARRAY['beauty', 'fantasy'], true, 'beauty', 4.9, 880, 220),

-- Lifestyle/Wellness Creators (25)
('Marcus Johnson', 'Fitness and wellness coach', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', ARRAY['fitness', 'wellness'], true, 'fitness', 4.7, 650, 120),
('Alex Chen', 'Tech entrepreneur and productivity guru', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', ARRAY['technology', 'productivity'], false, 'technology', 4.8, 420, 180),
('Jordan Blake', 'Lifestyle and fashion influencer', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', ARRAY['fashion', 'lifestyle'], true, 'fashion', 4.6, 890, 160),
('Ryan Cooper', 'Travel and adventure guide', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', ARRAY['travel', 'adventure'], true, 'travel', 4.9, 540, 140),
('Tyler Stone', 'Business and entrepreneurship mentor', 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150', ARRAY['business', 'entrepreneurship'], false, 'business', 4.8, 760, 250),
('Blake Rivers', 'Outdoor adventure specialist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', ARRAY['outdoor', 'adventure'], true, 'outdoor', 4.7, 320, 110),
('Cameron Storm', 'Mental health and mindfulness coach', 'https://images.unsplash.com/photo-1558222218-b7b54eede3f3?w=150', ARRAY['wellness', 'mindfulness'], true, 'wellness', 4.9, 680, 170),
('Hayden Cross', 'Photography and creative arts', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150', ARRAY['photography', 'arts'], false, 'arts', 4.6, 450, 130),
('Jamie Fox', 'Music production and audio engineering', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', ARRAY['music', 'audio'], true, 'music', 4.8, 570, 200),
('Quinn Taylor', 'Fashion styling and wardrobe consulting', 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150', ARRAY['fashion', 'styling'], false, 'fashion', 4.9, 810, 190),
('Sage Mitchell', 'Plant-based nutrition specialist', 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150', ARRAY['nutrition', 'vegan'], true, 'nutrition', 4.7, 390, 145),
('Phoenix Reed', 'Yoga and meditation instructor', 'https://images.unsplash.com/photo-1559582930-2f26d2650d2f?w=150', ARRAY['yoga', 'meditation'], true, 'wellness', 4.8, 920, 125),
('River Knight', 'Sustainable living advocate', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150', ARRAY['sustainability', 'eco'], false, 'lifestyle', 4.6, 280, 135),
('Skylar Dawn', 'Creative writing and storytelling', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', ARRAY['writing', 'storytelling'], true, 'arts', 4.9, 410, 150),
('Rowan Sage', 'Holistic health practitioner', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', ARRAY['health', 'holistic'], false, 'wellness', 4.8, 650, 160),
('Aspen Gray', 'Interior design consultant', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=150', ARRAY['design', 'interior'], true, 'design', 4.7, 740, 180),
('Onyx Blue', 'Digital marketing strategist', 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=150', ARRAY['marketing', 'digital'], true, 'business', 4.9, 530, 220),
('Cedar Stone', 'Woodworking and craftsmanship', 'https://images.unsplash.com/photo-1607346256330-dee7a0026c9b?w=150', ARRAY['crafts', 'woodworking'], false, 'crafts', 4.6, 190, 100),
('Ocean Wilde', 'Marine conservation educator', 'https://images.unsplash.com/photo-1618835962148-cf177563c6c0?w=150', ARRAY['conservation', 'marine'], true, 'education', 4.8, 360, 140),
('Storm Knight', 'Extreme sports athlete', 'https://images.unsplash.com/photo-1619895862022-09114b41f16f?w=150', ARRAY['sports', 'extreme'], true, 'sports', 4.9, 680, 160),
('Atlas Cross', 'Strength training coach', 'https://images.unsplash.com/photo-1621784563330-caee0b138391?w=150', ARRAY['fitness', 'strength'], false, 'fitness', 4.7, 820, 130),
('Zephyr Moon', 'Astrology and spiritual guidance', 'https://images.unsplash.com/photo-1624395213043-fa2e123b2656?w=150', ARRAY['spirituality', 'astrology'], true, 'spirituality', 4.8, 490, 175),
('Orion Blaze', 'Adventure photography specialist', 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?w=150', ARRAY['photography', 'adventure'], false, 'photography', 4.9, 560, 190),
('Nova Storm', 'Urban exploration guide', 'https://images.unsplash.com/photo-1631947430066-48c30d57b943?w=150', ARRAY['urban', 'exploration'], true, 'lifestyle', 4.6, 310, 120),
('Kai Rivers', 'Surfing and ocean sports', 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150', ARRAY['surfing', 'ocean'], true, 'sports', 4.8, 720, 145);

-- Create mock following relationships table
CREATE TABLE public.mock_user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_email TEXT NOT NULL,
  following_creator_id UUID NOT NULL REFERENCES public.mock_creators(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_email, following_creator_id)
);

-- Enable RLS
ALTER TABLE public.mock_user_follows ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own follows
CREATE POLICY "Users can view their mock follows" 
ON public.mock_user_follows 
FOR SELECT 
USING (true);

-- Insert 30 random follows for Sherrod.shackelford@gmail.com
INSERT INTO public.mock_user_follows (follower_email, following_creator_id) 
SELECT 'sherrod.shackelford@gmail.com', id 
FROM public.mock_creators 
ORDER BY RANDOM() 
LIMIT 30;