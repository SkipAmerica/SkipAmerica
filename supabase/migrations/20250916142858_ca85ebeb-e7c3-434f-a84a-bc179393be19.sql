-- Create storage buckets for file sharing
INSERT INTO storage.buckets (id, name, public) VALUES 
('creator-files', 'creator-files', false),
('call-attachments', 'call-attachments', false);

-- Create table for creator file repositories
CREATE TABLE public.creator_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  is_favorite BOOLEAN DEFAULT false,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_shared TIMESTAMP WITH TIME ZONE,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for call file shares
CREATE TABLE public.call_file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  file_id UUID, -- references creator_files if from repository
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tables
ALTER TABLE public.creator_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_file_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for creator_files
CREATE POLICY "Creators can manage their own files"
ON public.creator_files
FOR ALL
USING (auth.uid() = creator_id);

CREATE POLICY "Users can view shared files during calls"
ON public.creator_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.call_file_shares
    WHERE call_file_shares.file_id = creator_files.id
    AND call_file_shares.recipient_id = auth.uid()
  )
);

-- RLS policies for call_file_shares
CREATE POLICY "Users can view their call file shares"
ON public.call_file_shares
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create file shares in their calls"
ON public.call_file_shares
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update download status"
ON public.call_file_shares
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Storage policies for creator-files bucket
CREATE POLICY "Creators can upload their files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'creator-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can manage their files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'creator-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can download shared creator files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'creator-files'
  AND EXISTS (
    SELECT 1 FROM public.call_file_shares cfs
    JOIN public.creator_files cf ON cf.id = cfs.file_id
    WHERE cf.file_path = name
    AND cfs.recipient_id = auth.uid()
  )
);

-- Storage policies for call-attachments bucket
CREATE POLICY "Users can upload call attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'call-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Call participants can access attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'call-attachments'
  AND EXISTS (
    SELECT 1 FROM public.call_file_shares cfs
    WHERE cfs.file_path = name
    AND (cfs.sender_id = auth.uid() OR cfs.recipient_id = auth.uid())
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_creator_files_updated_at
  BEFORE UPDATE ON public.creator_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_creator_files_creator_id ON public.creator_files(creator_id);
CREATE INDEX idx_creator_files_favorite ON public.creator_files(creator_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_call_file_shares_call_id ON public.call_file_shares(call_id);
CREATE INDEX idx_call_file_shares_recipient ON public.call_file_shares(recipient_id);
CREATE INDEX idx_call_file_shares_sender ON public.call_file_shares(sender_id);