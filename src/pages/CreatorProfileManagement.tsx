import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Image as ImageIcon, DollarSign, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProfilePictureUploadModal } from '@/components/creator/ProfilePictureUploadModal';
import { BackgroundImageUploadModal } from '@/components/creator/BackgroundImageUploadModal';
import { PricingManagementModal } from '@/components/creator/PricingManagementModal';

export function CreatorProfileManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePictureModalOpen, setProfilePictureModalOpen] = useState(false);
  const [backgroundImageModalOpen, setBackgroundImageModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    headline: '',
    bio: '',
    long_bio: '',
    categories: [] as string[],
    location_city: '',
    location_country: '',
    avatar_url: '',
    background_image_url: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadCreatorData();
    }
  }, [user?.id]);

  const loadCreatorData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          username: data.username || '',
          headline: data.headline || '',
          bio: data.bio || '',
          long_bio: data.long_bio || '',
          categories: data.categories || [],
          location_city: data.location_city || '',
          location_country: data.location_country || '',
          avatar_url: data.avatar_url || '',
          background_image_url: data.background_image_url || ''
        });
      }
    } catch (error) {
      console.error('Error loading creator data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('creators')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          headline: formData.headline,
          bio: formData.bio,
          long_bio: formData.long_bio,
          categories: formData.categories,
          location_city: formData.location_city,
          location_country: formData.location_country
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also update profiles table for shared fields
      await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name
        })
        .eq('id', user.id);

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-splash flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-splash pb-[calc(var(--ios-tab-bar-height)+env(safe-area-inset-bottom)+(var(--lsb-visible)*var(--lsb-height))+24px)]">
      {/* Header */}
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Profile Management</h1>
        <p className="text-white/70">Manage your creator profile</p>
      </div>

      {/* Avatar Section */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setProfilePictureModalOpen(true)}
          className="relative group"
        >
          <Avatar className="h-32 w-32 border-4 border-white/30">
            <AvatarImage src={formData.avatar_url} />
            <AvatarFallback className="bg-white/10 text-white text-3xl">
              {formData.full_name?.[0] || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-8 w-8 text-white" />
          </div>
        </button>
      </div>

      <div className="px-4 space-y-6">
        {/* Background Image Card */}
        <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6">
          <button
            onClick={() => setBackgroundImageModalOpen(true)}
            className="w-full"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border-2 border-dashed border-white/30 hover:border-white/50 transition-colors group">
              {formData.background_image_url ? (
                <>
                  <img
                    src={formData.background_image_url}
                    alt="Background"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm opacity-70">Add Background Image</p>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Profile Information Card */}
        <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>

          <div>
            <label className="block text-white/70 text-sm mb-2">Display Name</label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Username</label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50"
              placeholder="@username"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Tagline</label>
            <Input
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50"
              placeholder="Your professional tagline"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Short Bio</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50 min-h-[80px]"
              placeholder="A brief description about yourself"
              maxLength={160}
            />
            <p className="text-white/50 text-xs mt-1">{formData.bio.length}/160</p>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Long Bio</label>
            <Textarea
              value={formData.long_bio}
              onChange={(e) => setFormData({ ...formData, long_bio: e.target.value })}
              className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50 min-h-[120px]"
              placeholder="Tell your story in detail"
              maxLength={500}
            />
            <p className="text-white/50 text-xs mt-1">{formData.long_bio.length}/500</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">City</label>
              <Input
                value={formData.location_city}
                onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Country</label>
              <Input
                value={formData.location_country}
                onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-white/50"
                placeholder="Country"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Manage Pricing Card */}
        <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6">
          <Button
            onClick={() => setPricingModalOpen(true)}
            className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-white border border-white/30"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Manage Pricing
          </Button>
        </div>
      </div>

      {/* Modals */}
      <ProfilePictureUploadModal
        isOpen={profilePictureModalOpen}
        onClose={() => setProfilePictureModalOpen(false)}
        creatorId={user!.id}
        currentAvatarUrl={formData.avatar_url}
        onUpdate={(newUrl) => {
          setFormData({ ...formData, avatar_url: newUrl });
          setProfilePictureModalOpen(false);
        }}
      />

      <BackgroundImageUploadModal
        isOpen={backgroundImageModalOpen}
        onClose={() => setBackgroundImageModalOpen(false)}
        creatorId={user!.id}
        currentImageUrl={formData.background_image_url}
        onUpdate={(newUrl) => {
          setFormData({ ...formData, background_image_url: newUrl });
          setBackgroundImageModalOpen(false);
        }}
      />

      <PricingManagementModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        creatorId={user!.id}
      />
    </div>
  );
}
