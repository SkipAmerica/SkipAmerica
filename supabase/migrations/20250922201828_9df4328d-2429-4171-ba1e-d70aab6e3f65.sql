-- Insert test data for call queue with discussion topics
INSERT INTO public.call_queue (creator_id, fan_id, joined_at, estimated_wait_minutes, discussion_topic, status) VALUES
-- Using the first creator from mock_creators table
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '10 minutes', 5, 'Want to discuss my YouTube channel growth strategy', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '8 minutes', 8, 'Need advice on brand partnerships and sponsorships', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '6 minutes', 12, 'Looking for feedback on my latest video content', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '4 minutes', 15, 'Interested in collaborating on future projects', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '3 minutes', 18, 'Questions about transitioning from TikTok to YouTube', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '2 minutes', 21, 'Want to learn about monetizing my social media presence', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '90 seconds', 24, 'Seeking guidance on building an authentic personal brand', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '75 seconds', 27, 'Need help with content planning and scheduling', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '60 seconds', 30, 'Questions about dealing with negative comments and trolls', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '45 seconds', 33, 'Want to discuss cross-platform content strategy', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '30 seconds', 36, 'Looking for tips on improving video editing skills', 'waiting'),
((SELECT id FROM mock_creators LIMIT 1), gen_random_uuid(), now() - interval '15 seconds', 39, 'Interested in learning about audience engagement tactics', 'waiting');