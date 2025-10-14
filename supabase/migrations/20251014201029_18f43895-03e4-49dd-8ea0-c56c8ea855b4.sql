-- Add phone number column to call_queue
ALTER TABLE call_queue 
ADD COLUMN IF NOT EXISTS fan_phone_number TEXT;

-- Add index for efficient phone lookups (Scalable)
CREATE INDEX IF NOT EXISTS idx_call_queue_fan_phone 
ON call_queue(fan_phone_number) 
WHERE fan_phone_number IS NOT NULL;

-- Add check constraint for basic E.164 format
ALTER TABLE call_queue
ADD CONSTRAINT chk_phone_format 
CHECK (
  fan_phone_number IS NULL OR 
  fan_phone_number ~ '^\+[1-9]\d{1,14}$'
);