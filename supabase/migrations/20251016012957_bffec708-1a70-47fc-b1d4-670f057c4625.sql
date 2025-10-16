-- Create follow relationship for sherrod.shackelford@gmail.com to follow Ulysses Turner
INSERT INTO public.user_follows (follower_id, following_id)
VALUES ('e2fca857-9bc3-419d-bb20-6f791d1a4a22', 'ed18cf44-172e-4084-a8d0-b4b1cef19b4c')
ON CONFLICT DO NOTHING;