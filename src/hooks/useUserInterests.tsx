import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Interest {
  id: string;
  label: string;
}

export const INTEREST_CATEGORIES: Record<string, Interest> = {
  'skincare': { id: 'skincare', label: 'Skincare & Beauty' },
  'makeup': { id: 'makeup', label: 'Makeup & Cosmetics' },
  'fashion': { id: 'fashion', label: 'Fashion & Style' },
  'haircare': { id: 'haircare', label: 'Hair & Styling' },
  'wellness': { id: 'wellness', label: 'Wellness & Self-Care' },
  'lifestyle': { id: 'lifestyle', label: 'Lifestyle & Living' },
  'fitness': { id: 'fitness', label: 'Fitness & Health' },
  'nutrition': { id: 'nutrition', label: 'Nutrition & Diet' },
  'motherhood': { id: 'motherhood', label: 'Motherhood & Parenting' },
  'career': { id: 'career', label: 'Career & Business' },
  'relationships': { id: 'relationships', label: 'Love & Relationships' },
  'travel': { id: 'travel', label: 'Travel & Adventure' }
};

export const useUserInterests = () => {
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserInterests = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserInterests(profile?.interests || []);
      } catch (error) {
        console.error('Error fetching user interests:', error);
        setUserInterests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInterests();
  }, [user]);

  const updateUserInterests = async (interests: string[]) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ interests })
        .eq('id', user.id);

      if (error) throw error;

      setUserInterests(interests);
      return { error: null };
    } catch (error) {
      console.error('Error updating user interests:', error);
      return { error: error as Error };
    }
  };

  // Get user's interest labels for display
  const getUserInterestLabels = () => {
    return userInterests
      .map(id => INTEREST_CATEGORIES[id]?.label)
      .filter(Boolean);
  };

  return {
    userInterests,
    loading,
    updateUserInterests,
    getUserInterestLabels,
  };
};