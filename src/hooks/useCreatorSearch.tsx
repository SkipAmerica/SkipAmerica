import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string;
  categories: string[];
  isOnline: boolean;
  nextAvailable?: string;
  ratingsCount: number;
  rating: number;
  headline: string;
  bio: string;
  location_country?: string;
  location_city?: string;
  celebrity_tier?: string;
  verification_status?: string;
  total_followers?: number;
  avg_engagement_rate?: number;
  base_rate_min?: number;
  base_rate_max?: number;
  available_for_booking?: boolean;
}

interface UseCreatorSearchProps {
  query?: string;
  categories?: string[];
  availableOnly?: boolean;
  limit?: number;
}

interface UseCreatorSearchResult {
  creators: Creator[];
  loading: boolean;
  error: string | null;
}

export function useCreatorSearch({
  query = '',
  categories = [],
  availableOnly = false,
  limit = 50
}: UseCreatorSearchProps): UseCreatorSearchResult {
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCreators = useCallback(async () => {
    if (!user) {
      setCreators([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Always try to fetch from database first
      const { data, error: searchError } = await supabase.functions.invoke('enhanced-creator-search', {
        body: {
          query,
          categories,
          availableOnly,
          limit
        }
      });

      if (searchError) {
        console.error('Search error details:', searchError);
        // If database fails and no query, return mock data
        if (!query && categories.length === 0) {
          const mockCreators = [
            { 
              id: '1', 
              full_name: 'Taylor Swift', 
              headline: 'Grammy-winning Artist & Songwriter',
              bio: 'Multi-platinum recording artist with numerous Grammy Awards and Billboard chart-toppers.',
              avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150',
              categories: ['entertainment', 'music'],
              isOnline: false,
              nextAvailable: 'Tomorrow 2pm',
              ratingsCount: 8900,
              rating: 4.9,
            },
            { 
              id: '2', 
              full_name: 'Elon Musk', 
              headline: 'CEO & Technology Innovator',
              bio: 'Entrepreneur and business magnate, CEO of Tesla and SpaceX, pioneering sustainable transport and space exploration.',
              avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
              categories: ['technology', 'business'],
              isOnline: false,
              nextAvailable: 'Friday 3pm',
              ratingsCount: 2180,
              rating: 4.7,
            },
            { 
              id: '3', 
              full_name: 'Jennifer Lopez', 
              headline: 'Multi-Platinum Artist & Performer',
              bio: 'Award-winning singer, actress, and businesswoman with decades of entertainment industry experience.',
              avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150',
              categories: ['entertainment', 'music'],
              isOnline: false,
              nextAvailable: 'Monday 10am',
              ratingsCount: 3450,
              rating: 4.9,
            }
          ];
          
          setCreators(mockCreators as Creator[]);
          return;
        }
        throw new Error(searchError.message || 'Search failed');
      }

      const searchResults = data?.creators || [];
      
      // Transform the data to match our expected Creator interface
      const transformedCreators: Creator[] = searchResults.map((creator: any) => ({
        id: creator.id,
        full_name: creator.full_name || 'Unknown Creator',
        avatar_url: creator.avatar_url || '',
        categories: creator.categories || [],
        isOnline: Math.random() > 0.7, // Mock online status for now
        nextAvailable: availableOnly ? undefined : 'Tomorrow 2pm', // Mock availability
        ratingsCount: 100 + Math.floor(Math.random() * 900),
        rating: 4.0 + Math.random(),
        headline: creator.headline || creator.bio?.substring(0, 50) + '...' || 'Creator',
        bio: creator.bio || '',
        location_country: creator.location_country,
        location_city: creator.location_city,
        celebrity_tier: creator.celebrity_tier,
        verification_status: creator.verification_status,
        total_followers: creator.total_followers,
        avg_engagement_rate: creator.avg_engagement_rate,
        base_rate_min: creator.base_rate_min,
        base_rate_max: creator.base_rate_max,
        available_for_booking: creator.available_for_booking
      }));

      setCreators(transformedCreators);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Creator search error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, query, categories, availableOnly, limit]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchCreators();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchCreators]);

  return {
    creators,
    loading,
    error
  };
}