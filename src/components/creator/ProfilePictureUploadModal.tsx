import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { IOSModal } from '@/components/mobile/IOSModal';
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
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 75;

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


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
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
    
    console.log('[ProfilePicture] Photo selected:', file.name, 'Size:', file.size);
    toast.success('Photo selected');
  };

  const uploadAvatar = async () => {
    if (!preview || !selectedFile) {
      toast.error('No file selected');
      return;
    }

    const file = selectedFile;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const filePath = `${creatorId}/avatars/${fileName}`;

      // Save current avatar to history before updating
      if (currentAvatarUrl) {
        await supabase.from('profile_picture_history').insert({
          user_id: creatorId,
          avatar_url: currentAvatarUrl,
          is_current: false
        });
      }

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile and creator records
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);

      if (profileError) throw profileError;

      const { error: creatorError } = await supabase
        .from('creators')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);

      if (creatorError) throw creatorError;

      // Add new avatar to history as current
      await supabase.from('profile_picture_history').insert({
        user_id: creatorId,
        avatar_url: publicUrl,
        is_current: true
      });

      toast.success('Profile picture updated successfully');
      onUpdate(publicUrl);
      setPreview(null);
      setViewingPrevious(false);
      onClose();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
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
    if (isTransitioning) return;
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    const offset = currentTouch - touchStart;
    setDragOffset(offset);
  };

  const onTouchEnd = () => {
    if (isTransitioning) return;
    
    const swipeDistance = touchEnd - touchStart;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      setIsTransitioning(true);
      
      if (swipeDistance > 0) {
        // Swiped right - go to previous
        setDirection('right');
        setTimeout(() => {
          setViewingPrevious(true);
          setIsTransitioning(false);
          setDirection(null);
          setDragOffset(0);
        }, 400);
      } else {
        // Swiped left - go to current
        setDirection('left');
        setTimeout(() => {
          setViewingPrevious(false);
          setIsTransitioning(false);
          setDirection(null);
          setDragOffset(0);
        }, 400);
      }
    } else {
      // Snap back with elastic bounce
      setDragOffset(0);
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
    <IOSModal
      open={isOpen}
      onOpenChange={onClose}
      size="md"
      showCloseButton={false}
      className="!bg-white !border-none"
    >
      <div className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
          {/* Preview with Swipe */}
          <div className="relative flex flex-col items-center">
            {/* Status Label */}
            {!preview && previousAvatarUrl && (
              <div 
                className="mb-3 text-sm font-medium text-gray-600 transition-opacity duration-200"
                style={{ opacity: isTransitioning ? 0 : 1 }}
              >
                {viewingPrevious ? 'Previous Photo' : 'Current Photo'}
              </div>
            )}

            <div 
              className="relative w-48 h-48 rounded-full overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {(preview || currentAvatarUrl || previousAvatarUrl) ? (
                <div className="relative w-full h-full">
                  <div 
                    className={`w-full h-full ${
                      isTransitioning 
                        ? direction === 'left' 
                          ? 'animate-slide-elastic-left' 
                          : 'animate-slide-elastic-right'
                        : 'transition-transform duration-300 ease-out'
                    }`}
                    style={{ 
                      transform: !isTransitioning ? `translateX(${dragOffset}px)` : undefined 
                    }}
                  >
                    <img
                      src={preview || (viewingPrevious ? previousAvatarUrl : currentAvatarUrl) || ''}
                      alt="Profile"
                      className="w-full h-full object-cover border-4 border-gray-200"
                    />
                  </div>
                  {preview && (
                    <button
                      onClick={removePreview}
                      className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Swipe Indicators with Parallax */}
              {!preview && previousAvatarUrl && currentAvatarUrl && (
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-2">
                  <ChevronRight 
                    className={`w-8 h-8 text-gray-400 transition-all duration-200 ${viewingPrevious ? 'opacity-100' : 'opacity-30'}`}
                    style={{ transform: `translateX(${dragOffset * 0.2}px)` }}
                  />
                  <ChevronLeft 
                    className={`w-8 h-8 text-gray-400 transition-all duration-200 ${!viewingPrevious ? 'opacity-100' : 'opacity-30'}`}
                    style={{ transform: `translateX(${dragOffset * 0.2}px)` }}
                  />
                </div>
              )}
            </div>

            {/* Swipe hint */}
            {!preview && previousAvatarUrl && (
              <div 
                className="mt-2 text-xs text-gray-500 text-center transition-opacity duration-200"
                style={{ opacity: isTransitioning ? 0 : 1 }}
              >
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
                capture="user"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-full space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl p-6 text-center cursor-pointer transition-colors"
                >
                  <Camera className="w-10 h-10 mx-auto mb-2" />
                  <p className="font-medium mb-1">Take Photo</p>
                  <p className="text-white/80 text-sm">Use your camera</p>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl p-6 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-10 h-10 mx-auto mb-2" />
                  <p className="font-medium mb-1">Choose from Library</p>
                  <p className="text-white/80 text-sm">Max 10MB • JPG, PNG, WEBP</p>
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {preview && (
            <Button
              onClick={uploadAvatar}
              disabled={uploading}
              className="w-full"
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
              className="w-full"
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
    </IOSModal>
  );
}
