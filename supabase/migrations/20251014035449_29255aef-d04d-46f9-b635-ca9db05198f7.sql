-- Clear all active Almighty sessions by updating status to 'ended'
UPDATE almighty_sessions 
SET 
  status = 'ended',
  ended_at = NOW()
WHERE status = 'active';

-- Clean up any pending session invites for ended sessions (use 'declined' status)
UPDATE session_invites
SET status = 'declined',
    responded_at = NOW()
WHERE status = 'pending'
  AND session_id IN (
    SELECT id FROM almighty_sessions WHERE status = 'ended'
  );

-- Clean up any lingering queue entries with in_call state
DELETE FROM call_queue
WHERE fan_state = 'in_call'
  AND NOT EXISTS (
    SELECT 1 FROM almighty_sessions 
    WHERE almighty_sessions.queue_entry_id = call_queue.id 
    AND almighty_sessions.status = 'active'
  );