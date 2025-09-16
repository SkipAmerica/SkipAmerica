-- Add account types and social verification system
CREATE TYPE public.account_type AS ENUM ('fan', 'creator', 'agency');
CREATE TYPE public.social_platform AS ENUM ('twitter', 'instagram', 'youtube', 'tiktok', 'linkedin');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'failed');

-- Update profiles table to include account type
ALTER TABLE public.profiles 
ADD COLUMN account_type account_type DEFAULT 'fan',
ADD COLUMN is_verified boolean DEFAULT false,
ADD COLUMN bio text,
ADD COLUMN avatar_url text;

-- Create social accounts table for connected platforms
CREATE TABLE public.social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT NOT NULL,
  follower_count INTEGER DEFAULT 0,
  account_created_at TIMESTAMP WITH TIME ZONE,
  verification_status verification_status DEFAULT 'pending',
  access_token TEXT, -- encrypted
  refresh_token TEXT, -- encrypted
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create creator content table for posts from social platforms
CREATE TABLE public.creator_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'post', 'video', 'image', etc.
  title TEXT,
  description TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(social_account_id, platform_post_id)
);

-- Create agencies table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subscription_status TEXT DEFAULT 'active', 
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  yearly_fee NUMERIC DEFAULT 1200.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agency-creator relationships
CREATE TABLE public.agency_creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{"manage_calendar": true, "manage_content": true, "manage_profile": true}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, creator_id)
);

-- Create user feed preferences
CREATE TABLE public.user_feed_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_creator_posts BOOLEAN DEFAULT false,
  followed_creators UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feed_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_accounts
CREATE POLICY "Users can manage their own social accounts" 
ON public.social_accounts 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view verified social accounts" 
ON public.social_accounts 
FOR SELECT 
USING (verification_status = 'verified');

-- RLS policies for creator_content
CREATE POLICY "Everyone can view creator content" 
ON public.creator_content 
FOR SELECT 
USING (true);

CREATE POLICY "Content owners can manage their content" 
ON public.creator_content 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.social_accounts 
  WHERE social_accounts.id = creator_content.social_account_id 
  AND social_accounts.user_id = auth.uid()
));

-- RLS policies for agencies
CREATE POLICY "Agency owners can manage their agencies" 
ON public.agencies 
FOR ALL 
USING (auth.uid() = owner_id);

CREATE POLICY "Everyone can view agencies" 
ON public.agencies 
FOR SELECT 
USING (true);

-- RLS policies for agency_creators
CREATE POLICY "Agency owners can manage their creator relationships" 
ON public.agency_creators 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.agencies 
  WHERE agencies.id = agency_creators.agency_id 
  AND agencies.owner_id = auth.uid()
));

CREATE POLICY "Creators can view their agency relationships" 
ON public.agency_creators 
FOR SELECT 
USING (auth.uid() = creator_id);

-- RLS policies for user_feed_preferences
CREATE POLICY "Users can manage their own feed preferences" 
ON public.user_feed_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_feed_preferences_updated_at
  BEFORE UPDATE ON public.user_feed_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();