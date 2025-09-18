import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { CreatorProfileEnhanced } from '@/components/creator/CreatorProfileEnhanced';
import { AgencyDashboard } from '@/components/agency/AgencyDashboard';
import { GroupCallPricing } from '@/components/calls/GroupCallPricing';
import { IOSNavBar } from '@/components/mobile/IOSNavBar';
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
      <div className="ios-screen">
        <IOSNavBar
          title="Profile"
          leftButton={{
            text: "Home",
            onClick: () => window.location.href = '/'
          }}
        />
        <div className="ios-content ios-loading-center">
          <div className="ios-spinner" />
          <div className="text-ios-secondary mt-3">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="ios-screen">
        <IOSNavBar
          title="Profile"
          leftButton={{
            text: "Home",
            onClick: () => window.location.href = '/'
          }}
        />
        <div className="ios-content ios-loading-center">
          <div className="text-ios-secondary">Profile not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-screen">
      <IOSNavBar
        title={profile.full_name || "Profile"}
        leftButton={{
          text: "Home",
          onClick: () => window.location.href = '/'
        }}
      />
      
      <div className="ios-content">
        {profile.account_type === 'agency' && isOwnProfile ? (
          <AgencyDashboard />
        ) : (
          <div className="space-y-4">
            <CreatorProfileEnhanced 
              creator={profile} 
              isOwnProfile={isOwnProfile} 
            />
            
            {profile.account_type === 'creator' && (
              <GroupCallPricing
                creatorId={profile.id}
                basePrice={85}
                isCreator={isOwnProfile}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}