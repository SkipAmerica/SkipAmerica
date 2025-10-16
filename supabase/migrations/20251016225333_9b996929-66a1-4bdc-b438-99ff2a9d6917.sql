-- Migration 1: Add CASCADE rules to foreign keys
ALTER TABLE content_reactions
  DROP CONSTRAINT IF EXISTS content_reactions_content_id_fkey,
  ADD CONSTRAINT content_reactions_content_id_fkey 
    FOREIGN KEY (content_id) 
    REFERENCES creator_content(id) 
    ON DELETE CASCADE;

ALTER TABLE content_comments
  DROP CONSTRAINT IF EXISTS content_comments_content_id_fkey,
  ADD CONSTRAINT content_comments_content_id_fkey 
    FOREIGN KEY (content_id) 
    REFERENCES creator_content(id) 
    ON DELETE CASCADE;

-- Migration 2: Add soft delete columns and audit table
ALTER TABLE creator_content
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason text NULL;

CREATE TABLE IF NOT EXISTS content_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deletion_reason text,
  content_snapshot jsonb NOT NULL,
  deleted_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE content_deletion_log ENABLE ROW LEVEL SECURITY;

-- Only content owners can view their deletion logs
CREATE POLICY "Owners can view their deletion logs" ON content_deletion_log
  FOR SELECT
  USING (
    deleted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM creator_content cc
      JOIN social_accounts sa ON cc.id = content_deletion_log.content_id
      WHERE sa.user_id = auth.uid()
    )
  );

-- Index for querying deleted content
CREATE INDEX IF NOT EXISTS idx_creator_content_deleted 
  ON creator_content(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Migration 3: Secure deletion function
CREATE OR REPLACE FUNCTION delete_creator_content(
  p_content_id uuid,
  p_reason text DEFAULT NULL,
  p_hard_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_content record;
  v_media_files text[];
BEGIN
  -- Authorization: Check ownership
  SELECT cc.*, sa.user_id INTO v_content
  FROM creator_content cc
  JOIN social_accounts sa ON cc.social_account_id = sa.id
  WHERE cc.id = p_content_id
    AND sa.user_id = v_user_id
    AND cc.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Content not found or unauthorized'
    );
  END IF;

  -- Collect media files for cleanup
  v_media_files := ARRAY[]::text[];
  IF v_content.media_url IS NOT NULL AND v_content.provider = 'supabase' THEN
    v_media_files := array_append(v_media_files, v_content.media_url);
  END IF;
  IF v_content.thumbnail_url IS NOT NULL AND v_content.provider = 'supabase' THEN
    v_media_files := array_append(v_media_files, v_content.thumbnail_url);
  END IF;

  IF p_hard_delete THEN
    -- Hard delete: Remove completely
    DELETE FROM creator_content WHERE id = p_content_id;
  ELSE
    -- Soft delete: Mark as deleted
    UPDATE creator_content
    SET 
      deleted_at = now(),
      deleted_by = v_user_id,
      deletion_reason = p_reason
    WHERE id = p_content_id;

    -- Log to audit trail
    INSERT INTO content_deletion_log (
      content_id,
      deleted_by,
      deletion_reason,
      content_snapshot
    ) VALUES (
      p_content_id,
      v_user_id,
      p_reason,
      to_jsonb(v_content)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'content_id', p_content_id,
    'media_files', v_media_files,
    'provider', v_content.provider,
    'playback_id', v_content.playback_id
  );
END;
$$;

-- Migration 4: Update RLS policies to hide soft-deleted content
DROP POLICY IF EXISTS "Anyone can view posts" ON creator_content;
DROP POLICY IF EXISTS "Everyone can view creator content" ON creator_content;

CREATE POLICY "Anyone can view active posts" ON creator_content
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Owners can view their deleted posts" ON creator_content
  FOR SELECT
  USING (
    deleted_at IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM social_accounts 
      WHERE id = creator_content.social_account_id 
      AND user_id = auth.uid()
    )
  );