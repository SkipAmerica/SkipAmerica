-- Fix security warning: Set search_path for trigger function
CREATE OR REPLACE FUNCTION public.cc_normalize_media_state()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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