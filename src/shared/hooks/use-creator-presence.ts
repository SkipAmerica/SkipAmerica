/**
 * React hook to observe any creator's online/offline status
 * Uses React Query for caching and real-time subscriptions for updates
 */
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { UseCreatorPresenceResult } from '@/shared/types/presence'

export function useCreatorPresence(creatorId: string | null): UseCreatorPresenceResult {
  const queryClient = useQueryClient()
  const [realtimeOnline, setRealtimeOnline] = useState<boolean | null>(null)

  // Fetch initial presence status
  const { data, isLoading, error } = useQuery({
    queryKey: ['creator-presence', creatorId],
    queryFn: async () => {
      if (!creatorId) return null

      const { data, error } = await supabase
        .from('creator_presence')
        .select('is_online, last_heartbeat')
        .eq('creator_id', creatorId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!creatorId,
    staleTime: 10000, // Consider data fresh for 10 seconds
  })

  // Set up real-time subscription for presence changes
  useEffect(() => {
    if (!creatorId) return

    const channel = supabase
      .channel(`presence-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creator_presence',
          filter: `creator_id=eq.${creatorId}`
        },
        (payload) => {
          console.log('[useCreatorPresence] Real-time update:', payload)
          
          if (payload.new && 'is_online' in payload.new) {
            const newOnlineStatus = payload.new.is_online || false
            setRealtimeOnline(newOnlineStatus)
            
            // Invalidate query to update cache
            queryClient.invalidateQueries({ queryKey: ['creator-presence', creatorId] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [creatorId, queryClient])

  // Determine online status: prefer real-time update, fallback to initial query
  const isOnline = realtimeOnline !== null ? realtimeOnline : (data?.is_online || false)

  return {
    isOnline,
    isLoading,
    error: error as Error | null
  }
}
