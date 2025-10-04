-- Add background_image_url to creators table
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS background_image_url text;

-- Create background-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('background-images', 'background-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for background-images bucket
CREATE POLICY "Creators can upload their own background images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'background-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view background images"
ON storage.objects FOR SELECT
USING (bucket_id = 'background-images');

CREATE POLICY "Creators can update their own background images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'background-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can delete their own background images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'background-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);