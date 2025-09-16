import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { CreatorProfileEnhanced } from '@/components/creator/CreatorProfileEnhanced';
import { AgencyDashboard } from '@/components/agency/AgencyDashboard';
import { GroupCallPricing } from '@/components/calls/GroupCallPricing';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  account_type: string;
  is_verified: boolean;
}

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    loadProfile();
  }, [userId, user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        throw new Error('No user ID available');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="flex items-center space-x-2"
              >
                <Video className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">Skip</span>
              </Button>
              <div className="text-lg font-semibold">Profile</div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = '/feed'}>
                Feed
              </Button>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="flex items-center space-x-2"
              >
                <Video className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">Skip</span>
              </Button>
              <div className="text-lg font-semibold">Profile</div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = '/feed'}>
                Feed
              </Button>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-muted-foreground">Profile not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2"
            >
              <Video className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">Skip</span>
            </Button>
            <div className="text-lg font-semibold">Profile</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Home
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/feed'}>
              Feed
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {profile.account_type === 'agency' && isOwnProfile ? (
          <AgencyDashboard />
        ) : (
          <div className="space-y-6">
            <CreatorProfileEnhanced 
              creator={profile} 
              isOwnProfile={isOwnProfile} 
            />
            
            {profile.account_type === 'creator' && (
              <GroupCallPricing
                creatorId={profile.id}
                basePrice={85} // This would come from creator pricing settings
                isCreator={isOwnProfile}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}