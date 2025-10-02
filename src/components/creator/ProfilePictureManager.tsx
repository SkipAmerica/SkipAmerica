import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { IOSListView, IOSListSection, IOSListItem } from '@/components/mobile/IOSListView';

interface ProfilePictureManagerProps {
  creatorId: string;
  currentAvatarUrl?: string;
  onUpdate?: (newUrl: string) => void;
}

export function ProfilePictureManager({ 
  creatorId, 
  currentAvatarUrl,
  onUpdate 
}: ProfilePictureManagerProps) {
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

    // Upload to Supabase Storage
    await uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
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
      onUpdate?.(publicUrl);
      setPreview(null);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: fileInputRef.current } as any);
    }
  };

  return (
    <IOSListView>
      <IOSListSection header="Current Profile Picture">
        <div className="p-4">
          <div className="flex flex-col items-center gap-4">
            {(preview || currentAvatarUrl) && (
              <div className="relative">
                <img
                  src={preview || currentAvatarUrl}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-contain border-4 border-border"
                />
                {preview && (
                  <button
                    onClick={() => setPreview(null)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {!currentAvatarUrl && !preview && (
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full p-6 border-2 border-dashed border-border rounded-lg text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click or drag to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 5MB • JPG, PNG, GIF, WEBP
              </p>
            </div>

            {preview && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            )}
          </div>
        </div>
      </IOSListSection>

      <IOSListSection header="Tips">
        <IOSListItem>
          <div className="text-sm text-muted-foreground">
            Use a clear, well-lit photo where your face is visible
          </div>
        </IOSListItem>
        <IOSListItem>
          <div className="text-sm text-muted-foreground">
            Square photos work best for profile pictures
          </div>
        </IOSListItem>
      </IOSListSection>
    </IOSListView>
  );
}
