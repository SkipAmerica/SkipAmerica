import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhotoUploadStepProps {
  creatorId: string;
  onComplete: (url: string) => void;
  onSkip: () => void;
}

export function PhotoUploadStep({ creatorId, onComplete, onSkip }: PhotoUploadStepProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const filePath = `${creatorId}/avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);

      if (profileError) throw profileError;

      // Update creators table
      const { error: creatorError } = await supabase
        .from('creators')
        .update({ avatar_url: publicUrl })
        .eq('id', creatorId);

      if (creatorError) throw creatorError;

      toast.success('Photo uploaded!');
      onComplete(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="relative backdrop-blur-md bg-background/95 rounded-2xl p-8 shadow-2xl border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-xl -z-10" />

          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">Add Your Photo</h2>
            <p className="text-muted-foreground">
              Choose a clear, professional photo so fans can recognize you
            </p>

            {/* Avatar Preview */}
            <div className="flex justify-center py-6">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-primary/20">
                  <AvatarImage src={preview || undefined} />
                  <AvatarFallback>
                    <User className="w-16 h-16 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                {!preview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="lg"
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photo
                  </>
                )}
              </Button>
              <Button
                onClick={onSkip}
                variant="ghost"
                size="lg"
                className="w-full"
                disabled={uploading}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          30% of profile completion
        </p>
      </div>
    </div>
  );
}
