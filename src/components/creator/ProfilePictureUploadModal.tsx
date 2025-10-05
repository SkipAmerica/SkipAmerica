import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Camera as CapCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useLocalStorage } from '@/shared/hooks/use-local-storage';

interface ProfilePictureUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  currentAvatarUrl?: string;
  onUpdate: (newUrl: string) => void;
}

export function ProfilePictureUploadModal({
  isOpen,
  onClose,
  creatorId,
  currentAvatarUrl,
  onUpdate
}: ProfilePictureUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previousAvatarUrl, setPreviousAvatarUrl] = useLocalStorage<string | null>(`previous_avatar_${creatorId}`, null);
  const [viewingPrevious, setViewingPrevious] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Fetch previous avatar from database
  useEffect(() => {
    const fetchPreviousAvatar = async () => {
      const { data } = await supabase
        .from('profile_picture_history')
        .select('avatar_url')
        .eq('user_id', creatorId)
        .eq('is_current', false)
        .order('set_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.avatar_url) {
        setPreviousAvatarUrl(data.avatar_url);
      }
    };

    if (isOpen && creatorId) {
      fetchPreviousAvatar();
    }
  }, [isOpen, creatorId, setPreviousAvatarUrl]);

  const handleTakePhoto = async () => {
    try {
      const platform = Capacitor.getPlatform();
      const isWeb = platform === 'web';
      
      console.log('[ProfilePicture] Taking photo on platform:', platform);
      
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: !isWeb,
        resultType: isWeb ? CameraResultType.DataUrl : CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: CameraDirection.Front // Force front-facing (selfie) camera
      });

      let blob: Blob;
      let previewUrl: string;

      if (isWeb && image.dataUrl) {
        // Web: Convert base64 DataUrl to blob manually (more reliable than fetch)
        console.log('[ProfilePicture] Web mode: Converting DataUrl to blob');
        
        // Extract base64 data from data URL
        const base64Data = image.dataUrl.split(',')[1];
        const mimeMatch = image.dataUrl.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        blob = new Blob([bytes], { type: mimeType });
        previewUrl = image.dataUrl;
        
        console.log('[ProfilePicture] Created blob from base64 - Size:', blob.size, 'Type:', blob.type);
      } else if (image.webPath) {
        // Native: Fetch the Uri blob
        console.log('[ProfilePicture] Native mode: Fetching Uri blob');
        const response = await fetch(image.webPath);
        blob = await response.blob();
        previewUrl = image.webPath;
        console.log('[ProfilePicture] Fetched native blob - Size:', blob.size, 'Type:', blob.type);
      } else {
        throw new Error('No image data received from camera');
      }

      // Validate blob
      if (blob.size === 0) {
        console.error('[ProfilePicture] Blob is empty!');
        throw new Error('Image capture produced empty file');
      }

      if (blob.size > 10 * 1024 * 1024) { // 10MB limit
        console.error('[ProfilePicture] Blob too large:', blob.size);
        throw new Error('Image is too large (max 10MB)');
      }

      console.log('[ProfilePicture] ✅ Valid blob created - Size:', blob.size, 'bytes, Type:', blob.type);

      // Use actual blob type or default to image/jpeg
      const mimeType = blob.type || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const file = new File([blob], `camera-${Date.now()}.${extension}`, { type: mimeType });
      
      console.log('[ProfilePicture] ✅ File object created:', file.name, 'Size:', file.size);
      
      setSelectedFile(file);
      setPreview(previewUrl);
    } catch (error) {
      // Check if user cancelled the camera (not an actual error)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCancelled = errorMessage.toLowerCase().includes('cancel') || 
                         errorMessage.toLowerCase().includes('user cancelled');
      
      if (isCancelled) {
        // User cancelled, silently return to modal without error
        return;
      }
      
      // Actual error occurred
      console.error('Error taking photo:', error);
      toast.error('Failed to take photo');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return;
    }

    // Store file and show preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!selectedFile) {
      console.error('[ProfilePicture] Upload failed: No file selected');
      toast.error('No file selected');
      return;
    }

    // Pre-upload validation
    if (selectedFile.size === 0) {
      console.error('[ProfilePicture] Upload failed: File is empty');
      toast.error('Cannot upload empty file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      console.error('[ProfilePicture] Upload failed: File too large', selectedFile.size);
      toast.error('File is too large (max 10MB)');
      return;
    }

    console.log('[ProfilePicture] Starting upload:', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type
    });

    try {
      setUploading(true);

      const file = selectedFile;
      const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const filePath = `${creatorId}/avatars/${fileName}`;

      console.log('[ProfilePicture] Upload path:', filePath);

      // Save current avatar to history before updating
      if (currentAvatarUrl) {
        console.log('[ProfilePicture] Saving current avatar to history');
        await supabase.from('profile_picture_history').insert({
          user_id: creatorId,
          avatar_url: currentAvatarUrl,
          is_current: false
        });
      }

      // Upload to storage
      console.log('[ProfilePicture] Uploading to Supabase storage...');
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('[ProfilePicture] Storage upload failed:', uploadError);
        throw uploadError;
      }

      console.log('[ProfilePicture] ✅ Upload successful');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('[ProfilePicture] Public URL:', publicUrl);

      // Update profile and creator records
      console.log('[ProfilePicture] Updating profile record...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);

      if (profileError) {
        console.error('[ProfilePicture] Profile update failed:', profileError);
        throw profileError;
      }

      console.log('[ProfilePicture] Updating creator record...');
      const { error: creatorError } = await supabase
        .from('creators')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);

      if (creatorError) {
        console.error('[ProfilePicture] Creator update failed:', creatorError);
        throw creatorError;
      }

      // Add new avatar to history as current
      console.log('[ProfilePicture] Adding to history as current');
      await supabase.from('profile_picture_history').insert({
        user_id: creatorId,
        avatar_url: publicUrl,
        is_current: true
      });

      console.log('[ProfilePicture] ✅ Upload complete and database updated');
      toast.success('Profile picture updated successfully');
      onUpdate(publicUrl);
      setPreview(null);
      setViewingPrevious(false);
      onClose();
    } catch (error) {
      console.error('[ProfilePicture] Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to upload: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const setAsCurrent = async () => {
    if (!previousAvatarUrl) return;

    try {
      setUploading(true);

      // Save current as history
      if (currentAvatarUrl) {
        await supabase.from('profile_picture_history').insert({
          user_id: creatorId,
          avatar_url: currentAvatarUrl,
          is_current: false
        });
      }

      // Update to previous
      await supabase.from('profiles').update({ avatar_url: previousAvatarUrl }).eq('id', creatorId);
      await supabase.from('creators').update({ avatar_url: previousAvatarUrl }).eq('id', creatorId);
      
      // Update history
      await supabase.from('profile_picture_history')
        .update({ is_current: true })
        .eq('user_id', creatorId)
        .eq('avatar_url', previousAvatarUrl);

      toast.success('Profile picture restored');
      onUpdate(previousAvatarUrl);
      setViewingPrevious(false);
      onClose();
    } catch (error) {
      console.error('Error restoring avatar:', error);
      toast.error('Failed to restore profile picture');
    } finally {
      setUploading(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && !viewingPrevious && previousAvatarUrl) {
      setViewingPrevious(true);
    }
    if (isLeftSwipe && viewingPrevious) {
      setViewingPrevious(false);
    }
  };

  const removePreview = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-white rounded-3xl max-w-[90%] py-0 px-[5%] gap-0">
        <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
          {/* Preview with Swipe */}
          <div className="relative flex flex-col items-center">
            {/* Status Label */}
            {!preview && previousAvatarUrl && (
              <div className="mb-3 text-sm font-medium text-gray-600">
                {viewingPrevious ? 'Previous Photo' : 'Current Photo'}
              </div>
            )}

            <div 
              className="relative"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {(preview || currentAvatarUrl || previousAvatarUrl) ? (
                <div className="relative">
                  <img
                    src={preview || (viewingPrevious ? previousAvatarUrl : currentAvatarUrl) || ''}
                    alt="Profile"
                    className="w-48 h-48 rounded-full object-cover border-4 border-gray-200 transition-opacity duration-300"
                  />
                  {preview && (
                    <button
                      onClick={removePreview}
                      className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-48 h-48 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Swipe Indicators */}
              {!preview && previousAvatarUrl && currentAvatarUrl && (
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-2">
                  <ChevronRight className={`w-8 h-8 text-gray-400 ${viewingPrevious ? 'opacity-100' : 'opacity-30'}`} />
                  <ChevronLeft className={`w-8 h-8 text-gray-400 ${!viewingPrevious ? 'opacity-100' : 'opacity-30'}`} />
                </div>
              )}
            </div>

            {/* Swipe hint */}
            {!preview && previousAvatarUrl && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                Swipe to see {viewingPrevious ? 'current' : 'previous'} photo
              </div>
            )}
          </div>

          {/* Upload Options */}
          {!preview && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-full space-y-3">
                <button
                  onClick={handleTakePhoto}
                  className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
                >
                  <Camera className="w-10 h-10 mx-auto mb-2 text-cyan-500" />
                  <p className="text-gray-900 font-medium mb-1">Take Photo</p>
                  <p className="text-gray-600 text-sm">Use your camera</p>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
                >
                  <Upload className="w-10 h-10 mx-auto mb-2 text-cyan-500" />
                  <p className="text-gray-900 font-medium mb-1">Choose from Library</p>
                  <p className="text-gray-600 text-sm">Max 5MB • JPG, PNG, WEBP</p>
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {preview && (
            <Button
              onClick={uploadAvatar}
              disabled={uploading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Photo'
              )}
            </Button>
          )}

          {viewingPrevious && !preview && (
            <Button
              onClick={setAsCurrent}
              disabled={uploading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                'Set as Current Photo'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
