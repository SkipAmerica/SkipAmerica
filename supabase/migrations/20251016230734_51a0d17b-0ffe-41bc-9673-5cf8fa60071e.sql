-- Add mux_upload_id column to track uploads precisely
ALTER TABLE creator_content
  ADD COLUMN mux_upload_id text NULL;

-- Index for fast webhook lookups
CREATE INDEX idx_creator_content_mux_upload_id 
  ON creator_content(mux_upload_id) 
  WHERE mux_upload_id IS NOT NULL;