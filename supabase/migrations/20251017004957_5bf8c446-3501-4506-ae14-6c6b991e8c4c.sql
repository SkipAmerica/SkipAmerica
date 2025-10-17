-- Drop problematic defaults that cause mis-rendering
ALTER TABLE public.creator_content
  ALTER COLUMN provider DROP DEFAULT,
  ALTER COLUMN media_status DROP DEFAULT;

-- Trigger function: Auto-set provider and media_status based on upload type
CREATE OR REPLACE FUNCTION public.cc_normalize_media_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Mux upload: Set provider='mux', media_status='processing'
  IF (NEW.mux_upload_id IS NOT NULL AND NEW.mux_upload_id <> '') THEN
    NEW.provider := COALESCE(NEW.provider, 'mux');
    NEW.media_status := COALESCE(NEW.media_status, 'processing');
  -- Supabase upload: Set provider='supabase', media_status='ready'
  ELSIF (NEW.media_url IS NOT NULL AND NEW.media_url <> '') THEN
    NEW.provider := COALESCE(NEW.provider, 'supabase');
    NEW.media_status := COALESCE(NEW.media_status, 'ready');
  END IF;
  RETURN NEW;
END$$;

-- Attach trigger to creator_content
DROP TRIGGER IF EXISTS cc_normalize_media_state_insupd ON public.creator_content;
CREATE TRIGGER cc_normalize_media_state_insupd
BEFORE INSERT OR UPDATE ON public.creator_content
FOR EACH ROW EXECUTE FUNCTION public.cc_normalize_media_state();

-- Index for fast webhook matching
CREATE INDEX IF NOT EXISTS cc_mx_upload_id_idx ON public.creator_content (mux_upload_id);

-- One-time fix: Unstick posts with playback_id but wrong status
UPDATE public.creator_content
SET media_status = 'ready', provider = 'mux'
WHERE playback_id IS NOT NULL
  AND COALESCE(media_status, '') <> 'ready';