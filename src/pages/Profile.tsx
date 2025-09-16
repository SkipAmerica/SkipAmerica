import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { CreatorProfileEnhanced } from '@/components/creator/CreatorProfileEnhanced';
import { AgencyDashboard } from '@/components/agency/AgencyDashboard';
import { GroupCallPricing } from '@/components/calls/GroupCallPricing';
import { toast } from 'sonner';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
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
  );
}