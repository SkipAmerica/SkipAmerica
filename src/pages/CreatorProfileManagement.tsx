import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Share2, Grid3x3, Video, Repeat, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProfilePictureUploadModal } from '@/components/creator/ProfilePictureUploadModal';
import { PricingManagementModal } from '@/components/creator/PricingManagementModal';
import { getProfileDisplayInfo } from '@/lib/profileUtils';

export function CreatorProfileManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profilePictureModalOpen, setProfilePictureModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    headline: '',
    bio: '',
    avatar_url: ''
  });

  const [stats] = useState({
    posts: 0,
    followers: 0,
    following: 0
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
        setProfile({
          full_name: data.full_name || '',
          username: data.username || '',
          headline: data.headline || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Error loading creator data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!user?.id) return;

    try {
      const updateData = { [field]: value, updated_at: new Date().toISOString() };
      
      const { error: creatorError } = await supabase
        .from('creators')
        .update(updateData)
        .eq('id', user.id);

      if (creatorError) throw creatorError;

      if (field === 'full_name') {
        await supabase
          .from('profiles')
          .update({ full_name: value })
          .eq('id', user.id);
      }

      setProfile({ ...profile, [field]: value });
      setEditingField(null);
      toast.success('Updated successfully');
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update');
    }
  };

  const displayInfo = getProfileDisplayInfo({ 
    full_name: profile.full_name, 
    avatar_url: profile.avatar_url 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(var(--ios-tab-bar-height)+env(safe-area-inset-bottom)+(var(--lsb-visible)*var(--lsb-height))+24px)]">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="px-4 pt-4 pb-6">
          {/* Avatar and Stats Row */}
          <div className="flex items-start gap-6 mb-4">
            {/* Avatar with Edit Button */}
            <div className="relative">
              <div 
                onClick={() => setProfilePictureModalOpen(true)}
                className="relative cursor-pointer group"
              >
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback 
                    style={{ 
                      backgroundColor: displayInfo.backgroundColor,
                      color: displayInfo.textColor 
                    }}
                  >
                    {displayInfo.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Plus size={14} className="text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around pt-2">
              <div className="text-center">
                <div className="text-xl font-semibold">{stats.posts}</div>
                <div className="text-sm text-muted-foreground">posts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold">{stats.followers}</div>
                <div className="text-sm text-muted-foreground">followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold">{stats.following}</div>
                <div className="text-sm text-muted-foreground">following</div>
              </div>
            </div>
          </div>

          {/* Name and Bio */}
          <div className="space-y-1">
            {editingField === 'full_name' ? (
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                onBlur={() => handleFieldUpdate('full_name', profile.full_name)}
                onKeyDown={(e) => e.key === 'Enter' && handleFieldUpdate('full_name', profile.full_name)}
                autoFocus
                className="font-semibold"
              />
            ) : (
              <div 
                onClick={() => setEditingField('full_name')}
                className="font-semibold cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
              >
                {profile.full_name || 'Add name'}
              </div>
            )}

            {editingField === 'headline' ? (
              <Input
                value={profile.headline}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                onBlur={() => handleFieldUpdate('headline', profile.headline)}
                onKeyDown={(e) => e.key === 'Enter' && handleFieldUpdate('headline', profile.headline)}
                autoFocus
                className="text-sm"
                placeholder="Add tagline"
              />
            ) : (
              <div 
                onClick={() => setEditingField('headline')}
                className="text-sm text-muted-foreground cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
              >
                {profile.headline || 'Add tagline'}
              </div>
            )}

            {profile.username && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">@{profile.username}</span>
              </div>
            )}

            {editingField === 'bio' ? (
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                onBlur={() => handleFieldUpdate('bio', profile.bio)}
                autoFocus
                className="text-sm min-h-[60px]"
                placeholder="Add bio"
              />
            ) : (
              <div 
                onClick={() => setEditingField('bio')}
                className="text-sm cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
              >
                {profile.bio || 'Add bio'}
              </div>
            )}
          </div>

          {/* Professional Dashboard Card */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="font-semibold text-sm">Professional dashboard</div>
            <div className="text-xs text-muted-foreground">Manage your call pricing and availability</div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setPricingModalOpen(true)}
            >
              <Settings size={16} className="mr-2" />
              Edit profile
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 size={16} className="mr-2" />
              Share profile
            </Button>
          </div>

          {/* Story Highlights Placeholder */}
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Plus size={24} className="text-muted-foreground/50" />
              </div>
              <span className="text-xs text-muted-foreground">New</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="border-t border-border">
          <div className="flex">
            <button className="flex-1 py-3 flex items-center justify-center border-b-2 border-foreground">
              <Grid3x3 size={20} />
            </button>
            <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
              <Video size={20} />
            </button>
            <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
              <Repeat size={20} />
            </button>
            <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
              <ImageIcon size={20} />
            </button>
          </div>
        </div>

        {/* Content Grid Placeholder */}
        <div className="grid grid-cols-3 gap-px bg-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-muted flex items-center justify-center">
              <ImageIcon size={32} className="text-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <ProfilePictureUploadModal
        isOpen={profilePictureModalOpen}
        onClose={() => {
          setProfilePictureModalOpen(false);
          loadCreatorData();
        }}
        creatorId={user!.id}
        currentAvatarUrl={profile.avatar_url}
        onUpdate={(url) => setProfile({ ...profile, avatar_url: url })}
      />

      <PricingManagementModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        creatorId={user!.id}
      />
    </div>
  );
}
