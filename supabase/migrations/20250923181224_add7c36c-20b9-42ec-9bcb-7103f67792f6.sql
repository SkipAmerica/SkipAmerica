-- Add a test priority user to verify the queue workflow
INSERT INTO call_queue (creator_id, fan_id, discussion_topic, priority, status, estimated_wait_minutes)
VALUES (
  'e2fca857-9bc3-419d-bb20-6f791d1a4a22',
  'dee90894-dbbb-47bb-88d9-64838cbc6e04',
  'Testing priority queue functionality',
  1,
  'waiting',
  2
);