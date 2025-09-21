/**
 * Queue manager - now integrates with centralized store
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useLiveStore } from '@/stores/live-store'

interface QueueManagerState {
  error?: string
  isConnected: boolean
}

export function useQueueManager(isLive: boolean) {
  const { user } = useAuth()
  const { toast } = useToast()
  const store = useLiveStore()
  const channelRef = useRef<any>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [state, setState] = useState<QueueManagerState>({
    isConnected: false
  })

  // Real-time subscription for queue changes
  useEffect(() => {
    if (!isLive || !user) return

    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${user.id}`
        },
        (payload) => {
          store.updateQueueCount(store.queueCount + 1)
          store.triggerHaptic()
          
          setState(prev => ({ ...prev, error: undefined, isConnected: true }))
          
          // Check for overload (>3 joins in 10s) - simplified version
          if (store.queueCount > 2) {
            toast({
              title: "Multiple joins",
              description: "Queue is heating up — haptics paused",
              duration: 3000
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${user.id}`
        },
        () => {
          store.updateQueueCount(Math.max(0, store.queueCount - 1))
          setState(prev => ({ ...prev, error: undefined, isConnected: true }))
        }
      )
      .on('system', { event: 'CHANNEL_ERROR' }, (error) => {
        console.error('Queue subscription error:', error)
        setState(prev => ({ ...prev, error: 'Connection lost', isConnected: false }))
        
        // Retry subscription after delay
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }
        retryTimeoutRef.current = setTimeout(() => {
          channel.subscribe()
        }, 5000)
      })
      .subscribe()

    channelRef.current = channel
    setState(prev => ({ ...prev, isConnected: true }))

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = undefined
      }
      setState(prev => ({ ...prev, isConnected: false }))
    }
  }, [isLive, user, toast, store])

  // Fetch initial queue count
  useEffect(() => {
    if (!isLive || !user) return

    let retryCount = 0
    const maxRetries = 3

    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'waiting')

        if (error) throw error

        store.updateQueueCount(count || 0)
        setState(prev => ({ ...prev, error: undefined }))
      } catch (error: any) {
        console.error('Error fetching queue count:', error)
        
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(fetchCount, 2000 * retryCount)
        } else {
          setState(prev => ({ ...prev, error: 'Failed to load queue' }))
        }
      }
    }

    fetchCount()
  }, [isLive, user, store])

  // Debounce the queue count to prevent UI jitter
  const debouncedQueueCount = useDebounce(store.queueCount, 300)

  const updateQueueCount = useCallback((count: number) => {
    store.updateQueueCount(count)
  }, [store])

  const incrementQueue = useCallback(() => {
    store.updateQueueCount(store.queueCount + 1)
    
    // Show toast for multiple joins
    toast({
      title: "Someone joined your queue!",
      description: "A new fan is waiting to connect with you",
      duration: 2000
    })
  }, [toast, store])

  return {
    queueCount: debouncedQueueCount,
    updateQueueCount,
    incrementQueue,
    error: state.error,
    isConnected: state.isConnected
  }
}