import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IOSListView, IOSListSection, IOSListItem } from "@/components/mobile/IOSListView";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, Save, Link, ExternalLink, Camera } from "lucide-react";

const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
  });

  const [links, setLinks] = useState([
    { platform: "Website", url: "" },
    { platform: "Instagram", url: "" },
    { platform: "TikTok", url: "" },
    { platform: "OnlyFans", url: "" },
  ]);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error loading profile",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('creator-files')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('creator-files')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));

      toast({
        title: "Avatar uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error uploading avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user?.id,
          full_name: profile.full_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    setLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, url: value } : link
    ));
  };

  return (
    <div className="space-y-4">
      {/* Profile Information */}
      <IOSListView>
        <IOSListSection header="Profile Information">
          {/* Avatar */}
          <IOSListItem>
            <div className="flex items-center justify-between w-full py-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback>
                    {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Profile Photo</div>
                  <div className="text-sm text-ios-secondary">JPG, PNG or GIF. Max 5MB</div>
                </div>
              </div>
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Camera className="h-4 w-4" />
                  </span>
                </Button>
              </label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </IOSListItem>

          {/* Display Name */}
          <IOSListItem>
            <div className="w-full">
              <div className="text-sm text-ios-secondary mb-1">Display Name</div>
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Your display name"
                className="ios-input"
              />
            </div>
          </IOSListItem>

          {/* Bio */}
          <IOSListItem>
            <div className="w-full">
              <div className="text-sm text-ios-secondary mb-1">Bio</div>
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell your fans about yourself..."
                className="ios-textarea"
                rows={4}
              />
            </div>
          </IOSListItem>
        </IOSListSection>
      </IOSListView>

      {/* Social Links */}
      <IOSListView>
        <IOSListSection header="Social Links">
          {links.map((link, index) => (
            <IOSListItem key={index}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="ios-icon-container">
                    <Link className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-ios-secondary mb-1">{link.platform}</div>
                    <Input
                      value={link.url}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder={`Your ${link.platform.toLowerCase()} URL`}
                      className="ios-input"
                    />
                  </div>
                </div>
                {link.url && (
                  <Button variant="ghost" size="sm" asChild className="ml-2">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </IOSListItem>
          ))}
        </IOSListSection>
      </IOSListView>

      {/* Save Button */}
      <div className="ios-safe-bottom px-4">
        <Button 
          onClick={handleSave} 
          disabled={loading} 
          className="ios-button-primary w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;