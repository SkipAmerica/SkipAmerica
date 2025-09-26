-- Add foreign key constraints to fix call_queue relationships
ALTER TABLE call_queue 
ADD CONSTRAINT fk_call_queue_fan_id 
FOREIGN KEY (fan_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE call_queue 
ADD CONSTRAINT fk_call_queue_creator_id 
FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;