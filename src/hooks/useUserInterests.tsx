import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Interest {
  id: string;
  label: string;
}

export const INTEREST_CATEGORIES: Record<string, Interest> = {
  'entertainment': { id: 'entertainment', label: 'Entertainment' },
  'technology': { id: 'technology', label: 'Technology' },
  'business': { id: 'business', label: 'Business' },
  'beauty': { id: 'beauty', label: 'Beauty' },
  'fitness': { id: 'fitness', label: 'Fitness' },
  'food': { id: 'food', label: 'Food' },
  'education': { id: 'education', label: 'Education' },
  'creative': { id: 'creative', label: 'Creative' },
  'music': { id: 'music', label: 'Music' },
  'photography': { id: 'photography', label: 'Photography' },
  'gaming': { id: 'gaming', label: 'Gaming' },
  'podcast': { id: 'podcast', label: 'Podcast' }
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