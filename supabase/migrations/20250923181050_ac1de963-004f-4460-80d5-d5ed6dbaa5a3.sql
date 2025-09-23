-- Clean up old live sessions (keep only the most recent one per creator)
UPDATE live_sessions 
SET ended_at = now(), session_duration_minutes = EXTRACT(EPOCH FROM (now() - started_at))/60
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY creator_id ORDER BY created_at DESC) as rn
    FROM live_sessions 
    WHERE ended_at IS NULL
  ) ranked
  WHERE rn > 1
);

-- Remove queue entries that don't have corresponding profiles (orphaned/mock data)
DELETE FROM call_queue 
WHERE fan_id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);

-- Update queue priorities to ensure proper ordering
UPDATE call_queue 
SET priority = CASE 
  WHEN priority > 0 THEN priority 
  ELSE 0 
END;