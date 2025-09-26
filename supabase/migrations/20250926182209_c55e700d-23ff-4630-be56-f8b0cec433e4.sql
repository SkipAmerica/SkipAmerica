-- Add 3 more test queue entries for testing the nested drawer
INSERT INTO call_queue (
    creator_id, 
    fan_id, 
    status, 
    joined_at, 
    created_at, 
    estimated_wait_minutes, 
    priority,
    discussion_topic
) VALUES 
(
    'e2fca857-9bc3-419d-bb20-6f791d1a4a22',
    '13f6b38b-3ff1-41d9-bfc7-14c3990daf29', 
    'waiting',
    '2025-09-26 18:08:40.000000+00',
    '2025-09-26 18:08:40.000000+00',
    8,
    0,
    'Want to discuss startup ideas'
),
(
    'e2fca857-9bc3-419d-bb20-6f791d1a4a22',
    'ccf0975c-25a2-4b04-a0d2-398596af80c0',
    'waiting', 
    '2025-09-26 18:08:45.000000+00',
    '2025-09-26 18:08:45.000000+00',
    12,
    0,
    'Career advice needed'
),
(
    'e2fca857-9bc3-419d-bb20-6f791d1a4a22',
    'cab633d2-53a5-44ea-8495-a7252198a5af',
    'waiting',
    '2025-09-26 18:08:50.000000+00', 
    '2025-09-26 18:08:50.000000+00',
    15,
    0,
    'Quick question about investments'
);