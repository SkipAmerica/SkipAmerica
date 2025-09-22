-- Fix queue test data: swap creator and fan IDs
-- Delete existing test entries
DELETE FROM public.call_queue WHERE creator_id = '1e04949f-858d-469f-96fb-d5d0d76e581f';

-- Create new queue entries with Sherrod as creator and JR Issac as fan
INSERT INTO public.call_queue (creator_id, fan_id, status, estimated_wait_minutes, joined_at, created_at) VALUES 
('e2fca857-9bc3-419d-bb20-6f791d1a4a22', '1e04949f-858d-469f-96fb-d5d0d76e581f', 'waiting', 5, now() - interval '3 minutes', now() - interval '3 minutes'),
('e2fca857-9bc3-419d-bb20-6f791d1a4a22', '1e04949f-858d-469f-96fb-d5d0d76e581f', 'waiting', 8, now() - interval '2 minutes', now() - interval '2 minutes'),
('e2fca857-9bc3-419d-bb20-6f791d1a4a22', '1e04949f-858d-469f-96fb-d5d0d76e581f', 'waiting', 12, now() - interval '1 minute', now() - interval '1 minute');