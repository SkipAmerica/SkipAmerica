-- Update existing test queue entries to use the actual user ID instead of mock creator ID
UPDATE public.call_queue 
SET creator_id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22' 
WHERE creator_id = 'dd853f86-cc7b-4cd4-98e7-caf9abd22997' 
AND status = 'waiting';