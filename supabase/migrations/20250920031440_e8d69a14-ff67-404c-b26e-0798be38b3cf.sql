-- Add JR Issac to mock_user_follows so he appears in the IG panel for the current user
INSERT INTO mock_user_follows (follower_email, following_creator_id)
VALUES (
  'sherrod.shackelford@gmail.com',
  '1e04949f-858d-469f-96fb-d5d0d76e581f'
) ON CONFLICT DO NOTHING;