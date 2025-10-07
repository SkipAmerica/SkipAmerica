-- Close stale live session
UPDATE live_sessions 
SET 
  ended_at = now(),
  session_duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60
WHERE id = 'aa000497-5a4c-461d-a72f-f2ece44d40d0'
  AND ended_at IS NULL;