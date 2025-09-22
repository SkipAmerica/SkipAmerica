-- Create test queue entries using existing users
-- Using JR Issac as creator and Sherrod as multiple test fans (with different timestamps to simulate different users)
INSERT INTO public.call_queue (creator_id, fan_id, status, estimated_wait_minutes, joined_at, created_at) VALUES 
('1e04949f-858d-469f-96fb-d5d0d76e581f', 'e2fca857-9bc3-419d-bb20-6f791d1a4a22', 'waiting', 5, now() - interval '3 minutes', now() - interval '3 minutes'),
('1e04949f-858d-469f-96fb-d5d0d76e581f', 'e2fca857-9bc3-419d-bb20-6f791d1a4a22', 'waiting', 10, now() - interval '2 minutes', now() - interval '2 minutes'),
('1e04949f-858d-469f-96fb-d5d0d76e581f', 'e2fca857-9bc3-419d-bb20-6f791d1a4a22', 'waiting', 15, now() - interval '1 minute', now() - interval '1 minute');