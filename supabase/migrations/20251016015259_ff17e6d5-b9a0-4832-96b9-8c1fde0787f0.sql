-- Add Lisa Pierson to creator_presence table
INSERT INTO public.creator_presence (creator_id, is_online, last_heartbeat)
VALUES ('6a3adb76-5f1f-4f43-b93d-b9b257e7d885', true, now())
ON CONFLICT (creator_id) 
DO UPDATE SET 
  is_online = true, 
  last_heartbeat = now(), 
  updated_at = now();

-- Also update creators table to reflect online status
UPDATE public.creators 
SET is_online = true, last_seen_at = now() 
WHERE id = '6a3adb76-5f1f-4f43-b93d-b9b257e7d885';