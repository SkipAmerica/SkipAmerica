import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, Users, Lock } from 'lucide-react';

interface PrivacySettings {
  show_full_name: boolean;
  show_bio: boolean;
  show_avatar: boolean;
  show_interests: boolean;
  profile_visibility: 'public' | 'followers' | 'private';
}

export const PrivacySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    show_full_name: false,
    show_bio: true,
    show_avatar: true,
    show_interests: true,
    profile_visibility: 'public',
  });

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profile_privacy_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSettings({
          show_full_name: data.show_full_name,
          show_bio: data.show_bio,
          show_avatar: data.show_avatar,
          show_interests: data.show_interests,
          profile_visibility: data.profile_visibility as 'public' | 'followers' | 'private',
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      toast({
        title: 'Error loading privacy settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profile_privacy_settings')
        .upsert({
          user_id: user?.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Privacy settings updated',
        description: 'Your privacy preferences have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: 'Error saving settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading privacy settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control who can see your profile information and how it's displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Visibility */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <Label htmlFor="profile-visibility" className="font-medium">
                Profile Visibility
              </Label>
            </div>
            <Select 
              value={settings.profile_visibility} 
              onValueChange={(value) => updateSetting('profile_visibility', value as 'public' | 'followers' | 'private')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visibility level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Public</div>
                      <div className="text-sm text-muted-foreground">Everyone can see your profile</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="followers">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Followers Only</div>
                      <div className="text-sm text-muted-foreground">Only your followers can see your profile</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Private</div>
                      <div className="text-sm text-muted-foreground">Only you can see your full profile</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profile Information Toggles */}
          <div className="space-y-4">
            <Label className="font-medium">Profile Information</Label>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-name" className="text-sm font-medium">
                    Show Full Name
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Display your real name on your profile
                  </div>
                </div>
                <Switch
                  id="show-name"
                  checked={settings.show_full_name}
                  onCheckedChange={(checked) => updateSetting('show_full_name', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-bio" className="text-sm font-medium">
                    Show Bio
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Display your biography on your profile
                  </div>
                </div>
                <Switch
                  id="show-bio"
                  checked={settings.show_bio}
                  onCheckedChange={(checked) => updateSetting('show_bio', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-avatar" className="text-sm font-medium">
                    Show Profile Picture
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Display your avatar image on your profile
                  </div>
                </div>
                <Switch
                  id="show-avatar"
                  checked={settings.show_avatar}
                  onCheckedChange={(checked) => updateSetting('show_avatar', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-interests" className="text-sm font-medium">
                    Show Interests
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Display your selected interests on your profile
                  </div>
                </div>
                <Switch
                  id="show-interests"
                  checked={settings.show_interests}
                  onCheckedChange={(checked) => updateSetting('show_interests', checked)}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Privacy Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Shield className="h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-800">
              <div className="font-medium mb-2">Enhanced Password Security Available</div>
              <p>
                For maximum security, we recommend enabling leaked password protection in your account settings. 
                This feature prevents the use of passwords that have been compromised in data breaches.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};