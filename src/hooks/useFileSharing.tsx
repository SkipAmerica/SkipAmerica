import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface FileShare {
  id: string;
  call_id: string;
  sender_id: string;
  recipient_id: string;
  file_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  shared_at: string;
  downloaded_at?: string;
}

export interface CreatorFile {
  id: string;
  creator_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description?: string;
  is_favorite: boolean;
  upload_date: string;
  last_shared?: string;
  share_count: number;
}

export function useFileSharing(callId: string, userId: string) {
  const [uploading, setUploading] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<FileShare[]>([]);
  const [creatorFiles, setCreatorFiles] = useState<CreatorFile[]>([]);

  // Upload file during call
  const uploadCallFile = useCallback(async (file: File, recipientId: string) => {
    try {
      setUploading(true);
      
      // Check if user is authenticated
      if (!userId) {
        throw new Error('You must be logged in to upload files');
      }
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      
      console.log('Uploading call file with path:', fileName); // Debug log
      
      // Upload to call-attachments bucket
      const { error: uploadError } = await supabase.storage
        .from('call-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Record the file share
      const { error: shareError } = await supabase
        .from('call_file_shares')
        .insert({
          call_id: callId,
          sender_id: userId,
          recipient_id: recipientId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type
        });
      
      if (shareError) throw shareError;
      
      toast({
        title: "File Shared",
        description: `${file.name} has been shared successfully`
      });
      
      // Refresh shared files
      await loadSharedFiles();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to share file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [callId, userId]);

  // Share file from creator repository
  const shareRepositoryFile = useCallback(async (fileId: string, recipientId: string) => {
    try {
      // Get file details from creator_files
      const { data: fileData, error: fileError } = await supabase
        .from('creator_files')
        .select('*')
        .eq('id', fileId)
        .single();
      
      if (fileError) throw fileError;
      
      // Record the file share
      const { error: shareError } = await supabase
        .from('call_file_shares')
        .insert({
          call_id: callId,
          sender_id: userId,
          recipient_id: recipientId,
          file_id: fileId,
          file_name: fileData.file_name,
          file_path: fileData.file_path,
          file_size: fileData.file_size,
          file_type: fileData.file_type
        });
      
      if (shareError) throw shareError;
      
      // Update share count and last shared
      await supabase
        .from('creator_files')
        .update({
          share_count: fileData.share_count + 1,
          last_shared: new Date().toISOString()
        })
        .eq('id', fileId);
      
      toast({
        title: "File Shared",
        description: `${fileData.file_name} has been shared from your repository`
      });
      
      await loadSharedFiles();
      
    } catch (error: any) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: error.message || "Failed to share file from repository",
        variant: "destructive"
      });
    }
  }, [callId, userId]);

  // Download shared file
  const downloadFile = useCallback(async (share: FileShare) => {
    try {
      const bucket = share.file_id ? 'creator-files' : 'call-attachments';
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(share.file_path);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = share.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Mark as downloaded
      if (!share.downloaded_at) {
        await supabase
          .from('call_file_shares')
          .update({ downloaded_at: new Date().toISOString() })
          .eq('id', share.id);
        
        await loadSharedFiles();
      }
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download file",
        variant: "destructive"
      });
    }
  }, []);

  // Load shared files for current call
  const loadSharedFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('call_file_shares')
        .select('*')
        .eq('call_id', callId)
        .order('shared_at', { ascending: false });
      
      if (error) throw error;
      setSharedFiles(data || []);
      
    } catch (error: any) {
      console.error('Load shared files error:', error);
    }
  }, [callId]);

  // Load creator's file repository
  const loadCreatorFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('creator_files')
        .select('*')
        .eq('creator_id', userId)
        .order('is_favorite', { ascending: false })
        .order('upload_date', { ascending: false });
      
      if (error) throw error;
      setCreatorFiles(data || []);
      
    } catch (error: any) {
      console.error('Load creator files error:', error);
    }
  }, [userId]);

  return {
    uploading,
    sharedFiles,
    creatorFiles,
    uploadCallFile,
    shareRepositoryFile,
    downloadFile,
    loadSharedFiles,
    loadCreatorFiles
  };
}