import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { IOSModal } from '@/components/mobile/IOSModal';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!preview || !fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const filePath = `${creatorId}/avatars/${fileName}`;

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

      toast.success('Profile picture updated successfully');
      onUpdate(publicUrl);
      setPreview(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const removePreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <IOSModal
      open={isOpen}
      onOpenChange={onClose}
      size="md"
    >
      <div className="flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
          {/* Preview */}
          <div className="relative">
            {(preview || currentAvatarUrl) ? (
              <div className="relative">
                <img
                  src={preview || currentAvatarUrl}
                  alt="Profile"
                  className="w-48 h-48 rounded-full object-cover border-4 border-white/30"
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
              <div className="w-48 h-48 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center">
                <Camera className="w-16 h-16 text-white/50" />
              </div>
            )}
          </div>

          {/* Upload Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full backdrop-blur-sm bg-white/10 border-2 border-dashed border-white/30 rounded-2xl p-8 text-center cursor-pointer hover:border-white/50 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-3 text-white/70" />
            <p className="text-white font-medium mb-1">Click to upload</p>
            <p className="text-white/70 text-sm">Max 5MB • JPG, PNG, WEBP</p>
          </div>

          {/* Action Buttons */}
          {preview && (
            <Button
              onClick={uploadAvatar}
              disabled={uploading}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
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
        </div>
      </div>
    </IOSModal>
  );
}
