-- Phase 1: Add real-time presence tracking

-- Add online status columns to creators table
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create creator presence table for real-time heartbeat tracking
CREATE TABLE IF NOT EXISTS creator_presence (
  creator_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on creator_presence
ALTER TABLE creator_presence ENABLE ROW LEVEL SECURITY;

-- Creators can update their own presence
CREATE POLICY "Creators can update their own presence"
ON creator_presence
FOR ALL
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Everyone can view creator presence
CREATE POLICY "Everyone can view creator presence"
ON creator_presence
FOR SELECT
USING (true);

-- Function to auto-mark creators offline after 2 minutes of no heartbeat
CREATE OR REPLACE FUNCTION check_creator_presence() 
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE creator_presence 
  SET is_online = false, updated_at = now()
  WHERE last_heartbeat < now() - INTERVAL '2 minutes'
  AND is_online = true;
  
  -- Also update creators table
  UPDATE creators 
  SET is_online = false, last_seen_at = now()
  WHERE id IN (
    SELECT creator_id FROM creator_presence 
    WHERE last_heartbeat < now() - INTERVAL '2 minutes'
    AND is_online = true
  );
END;
$$;

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION update_creator_presence_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_creator_presence_updated_at
BEFORE UPDATE ON creator_presence
FOR EACH ROW
EXECUTE FUNCTION update_creator_presence_timestamp();

-- Add realtime for creator_presence
ALTER PUBLICATION supabase_realtime ADD TABLE creator_presence;