// Consolidated creator search hook
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { queryKeys } from '@/shared/api/query-keys'
import { handleSupabaseError } from '@/shared/api/errors'
import { useAuth } from '@/app/providers/auth-provider'
import type { CreatorSearchResult, DiscoveryFilters } from '../types'

export function useCreatorSearch(filters: DiscoveryFilters) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.creators(filters),
    queryFn: async (): Promise<CreatorSearchResult[]> => {
      // Only authenticated users can access creator data now
      if (!user) {
        return []
      }
      let query = supabase
        .from('creators')
        .select(`
          id,
          full_name,
          bio,
          avatar_url,
          categories,
          base_rate_min,
          base_rate_max,
          available_for_booking,
          verification_status,
          celebrity_tier
        `)
        .eq('is_suppressed', false)

      // Apply filters
      if (filters.query) {
        query = query.or(`full_name.ilike.%${filters.query}%,bio.ilike.%${filters.query}%`)
      }

      if (filters.selectedCategory && filters.selectedCategory !== 'all') {
        query = query.contains('categories', [filters.selectedCategory])
      }

      if (filters.showAvailableOnly) {
        query = query.eq('available_for_booking', true)
      }

      if (filters.verifiedOnly) {
        query = query.eq('verification_status', 'verified')
      }

      if (filters.priceRange) {
        const [min, max] = filters.priceRange
        query = query.gte('base_rate_min', min).lte('base_rate_max', max)
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'rating':
          // Note: This would need to be implemented with a view or function
          break
        case 'price':
          query = query.order('base_rate_min', { ascending: true })
          break
        case 'availability':
          query = query.order('available_for_booking', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query.limit(50)

      if (error) throw handleSupabaseError(error)

      // Transform data to include mock rating data for now
      return (data || []).map(creator => ({
        ...creator,
        is_online: Math.random() > 0.5, // Mock data
        rating: 4.2 + Math.random() * 0.6,
        ratings_count: Math.floor(Math.random() * 200) + 50,
      }))
    },
    enabled: true,
    staleTime: 30000, // 30 seconds
  })
}