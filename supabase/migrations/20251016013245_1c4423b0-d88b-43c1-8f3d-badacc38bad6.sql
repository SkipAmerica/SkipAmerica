-- Make Ulysses Turner appear as online
INSERT INTO public.creator_presence (creator_id, is_online, last_heartbeat)
VALUES ('ed18cf44-172e-4084-a8d0-b4b1cef19b4c', true, now())
ON CONFLICT (creator_id) 
DO UPDATE SET 
  is_online = true,
  last_heartbeat = now(),
  updated_at = now();

-- Also update the creators table
UPDATE public.creators
SET 
  is_online = true,
  last_seen_at = now()
WHERE id = 'ed18cf44-172e-4084-a8d0-b4b1cef19b4c';