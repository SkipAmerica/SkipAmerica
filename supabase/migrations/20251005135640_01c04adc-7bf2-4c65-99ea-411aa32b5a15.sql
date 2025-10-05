-- Create profile picture history table
CREATE TABLE IF NOT EXISTS public.profile_picture_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT NOT NULL,
  set_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profile_picture_history_user 
ON public.profile_picture_history(user_id, set_at DESC);

-- Enable RLS
ALTER TABLE public.profile_picture_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own picture history"
ON public.profile_picture_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert their own picture history"
ON public.profile_picture_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own history
CREATE POLICY "Users can update their own picture history"
ON public.profile_picture_history
FOR UPDATE
USING (auth.uid() = user_id);