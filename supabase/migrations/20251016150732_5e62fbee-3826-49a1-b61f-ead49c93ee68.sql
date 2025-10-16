-- Add columns for Mux + Supabase hybrid storage
ALTER TABLE public.creator_content
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS playback_id text,
  ADD COLUMN IF NOT EXISTS duration_sec int,
  ADD COLUMN IF NOT EXISTS aspect_ratio text,
  ADD COLUMN IF NOT EXISTS media_status text DEFAULT 'ready';

-- Enable RLS on creator_content
ALTER TABLE public.creator_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view posts" ON public.creator_content;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.creator_content;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.creator_content;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.creator_content;

-- RLS Policy: Anyone can view posts
CREATE POLICY "Anyone can view posts"
  ON public.creator_content FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Users can create their own posts
CREATE POLICY "Users can create their own posts"
  ON public.creator_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_accounts sa
      WHERE sa.id = creator_content.social_account_id
        AND sa.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON public.creator_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.social_accounts sa
      WHERE sa.id = creator_content.social_account_id
        AND sa.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON public.creator_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.social_accounts sa
      WHERE sa.id = creator_content.social_account_id
        AND sa.user_id = auth.uid()
    )
  );

-- Trigger to keep like_count in sync from content_reactions
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.creator_content c
    SET like_count = (
      SELECT count(*) FROM public.content_reactions r
      WHERE r.content_id = c.id AND r.reaction_type = 'like'
    )
  WHERE c.id = COALESCE(NEW.content_id, OLD.content_id);
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS trg_like_count_insert ON public.content_reactions;
CREATE TRIGGER trg_like_count_insert
AFTER INSERT OR DELETE ON public.content_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_like_count();