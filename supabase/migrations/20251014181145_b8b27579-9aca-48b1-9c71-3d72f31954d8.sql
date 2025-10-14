-- Add UNIQUE constraint on (creator_id, fan_id) to prevent duplicate queue entries
ALTER TABLE public.call_queue 
DROP CONSTRAINT IF EXISTS call_queue_creator_fan_unique;

ALTER TABLE public.call_queue 
ADD CONSTRAINT call_queue_creator_fan_unique UNIQUE (creator_id, fan_id);