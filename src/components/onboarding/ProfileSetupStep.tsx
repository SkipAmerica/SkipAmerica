import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ProfileSetupStepProps {
  creatorId: string;
  existingPhotoUrl?: string;
  existingDisplayName?: string;
  existingTagline?: string;
  onComplete: (photoUrl: string | null, displayName: string, tagline: string) => void;
  onSkip: () => void;
}

export function ProfileSetupStep({
  creatorId,
  existingPhotoUrl,
  existingDisplayName,
  existingTagline,
  onComplete,
  onSkip,
}: ProfileSetupStepProps) {
  const [displayName, setDisplayName] = useState(existingDisplayName || '');
  const [tagline, setTagline] = useState(existingTagline || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(existingPhotoUrl || null);
  const [preview, setPreview] = useState<string | null>(existingPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingData = !!(existingPhotoUrl || existingDisplayName || existingTagline);

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
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      setPreview(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo');
      setPreview(existingPhotoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    if (!tagline.trim()) {
      toast.error('Please enter a bio');
      return;
    }

    if (tagline.length > 100) {
      toast.error('Bio must be 100 characters or less');
      return;
    }

    setSaving(true);
    try {
      // Update profile and creator records
      if (photoUrl) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: photoUrl })
          .eq('id', creatorId);

        if (profileError) throw profileError;

        const { error: creatorError } = await supabase
          .from('creators')
          .update({ avatar_url: photoUrl })
          .eq('id', creatorId);

        if (creatorError) throw creatorError;
      }

      await onComplete(photoUrl, displayName, tagline);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="relative backdrop-blur-md bg-background/95 rounded-2xl p-8 shadow-2xl border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-xl -z-10" />

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold">
                {hasExistingData ? 'Review Your Profile' : 'Setup Your Profile'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {hasExistingData ? 'Edit your details or continue' : 'Help fans find and recognize you'}
              </p>
            </div>

            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32 border-4 border-border">
                <AvatarImage src={preview || undefined} />
                <AvatarFallback className="bg-muted">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>

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
                className="w-full p-4 border-2 border-dashed border-border rounded-lg text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : preview ? 'Change Photo' : 'Upload Photo'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Max 5MB • JPG, PNG, GIF, WEBP</p>
              </div>
            </div>

            {/* Display Name Field */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or stage name"
                className="backdrop-blur-sm bg-background/50 border-border/50 focus:border-primary transition-colors"
                maxLength={50}
                disabled={saving || uploading}
              />
            </div>

            {/* Tagline/Bio Field */}
            <div className="space-y-2">
              <Label htmlFor="tagline">
                Your Bio
                <span className="text-muted-foreground text-xs ml-2">({tagline.length}/100)</span>
              </Label>
              <Textarea
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Describe what you do..."
                className="backdrop-blur-sm bg-background/50 border-border/50 focus:border-primary transition-colors resize-none"
                rows={3}
                maxLength={100}
                disabled={saving || uploading}
              />
              <p className="text-xs text-muted-foreground">
                Example: "Fitness coach helping you achieve your goals"
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleContinue}
                disabled={saving || uploading || !displayName.trim() || !tagline.trim()}
                size="lg"
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
              <Button
                onClick={onSkip}
                variant="ghost"
                size="lg"
                className="w-full"
                disabled={saving || uploading}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {displayName && tagline ? (photoUrl ? '60%' : '50%') : '30%'} of profile completion
        </p>
      </div>
    </div>
  );
}
