-- Fix foreign key relationship for playlist_content to creator_content
ALTER TABLE public.playlist_content 
ADD CONSTRAINT fk_playlist_content_content_id 
FOREIGN KEY (content_id) REFERENCES public.creator_content(id) ON DELETE CASCADE;