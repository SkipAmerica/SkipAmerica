-- Create storage bucket for post media (photos/videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts-media', 'posts-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for posts-media bucket
CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'posts-media');

CREATE POLICY "Users can upload their own post media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posts-media' 
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'posts-media'
    AND (storage.foldername(name))[1] = 'users' 
    AND (storage.foldername(name))[2] = auth.uid()::text
  );