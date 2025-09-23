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
  retryCount: number
  lastFetchTime: number
}

export function useQueueManager(isLive: boolean, isDiscoverable: boolean = false) {
  const { user } = useAuth()
  const { toast } = useToast()
  const store = useLiveStore()
  const channelRef = useRef<any>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [state, setState] = useState<QueueManagerState>({
    isConnected: false,
    retryCount: 0,
    lastFetchTime: 0
  })

  // Real-time subscription for queue changes
  useEffect(() => {
    if (!user) return

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
        async (payload) => {
          console.log('[QueueManager] INSERT event received:', payload)
          
          // Fetch current queue count to avoid stale closure
          const { count } = await supabase
            .from('call_queue')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'waiting')
          
          const currentCount = count || 0
          console.log('[QueueManager] Updated queue count immediately:', currentCount)
          store.updateQueueCount(currentCount)
          store.triggerHaptic()
          
          setState(prev => ({ ...prev, error: undefined, isConnected: true }))
          
          // Check for overload (>3 joins in 10s) - simplified version
          if (currentCount > 2) {
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
        async () => {
          console.log('[QueueManager] DELETE event received')
          
          // Fetch current queue count to avoid stale closure
          const { count } = await supabase
            .from('call_queue')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'waiting')
          
          const currentCount = count || 0
          console.log('[QueueManager] Updated queue count immediately:', currentCount)
          store.updateQueueCount(currentCount)
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
  }, [user, toast, store])

  // Fetch initial queue count with enhanced error recovery and proper abort handling
  useEffect(() => {
    if (!user) return

    const now = Date.now()
    const timeSinceLastFetch = now - state.lastFetchTime
    
    // Debounce rapid successive calls (prevent spam from render loops)
    if (timeSinceLastFetch < 2000) {
      console.log('[QueueManager] Debouncing fetch request')
      return
    }

    let mounted = true
    let currentController: AbortController | null = new AbortController()

    const fetchCount = async (attempt: number = 0) => {
      if (!mounted || !currentController) return

      const maxRetries = 3
      const baseDelay = 2000
      const maxDelay = 10000

      try {
        setState(prev => ({ ...prev, lastFetchTime: now }))
        
        const { count, error } = await supabase
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'waiting')
          .order('priority', { ascending: false })
          .order('joined_at', { ascending: true })
          .abortSignal(currentController.signal)

        if (!mounted || !currentController) return

        if (error && error.code !== 'PGRST116') { // Ignore empty result errors
          throw new Error(`Database error: ${error.message}`)
        }

        // Success - reset retry count and update state
        store.updateQueueCount(count || 0)
        setState(prev => ({ 
          ...prev, 
          error: undefined, 
          isConnected: true,
          retryCount: 0
        }))
        
      } catch (error: any) {
        // Ignore AbortError - this is normal cleanup
        if (!mounted || !currentController || error.name === 'AbortError') {
          console.log('[QueueManager] Request aborted (normal cleanup)')
          return
        }
        
        console.warn(`[QueueManager] Fetch attempt ${attempt + 1} failed:`, error.message)
        
        const isNetworkError = error.message?.includes('503') || 
                              error.message?.includes('Failed to fetch') ||
                              error.message?.includes('NetworkError') ||
                              error.message?.includes('Connection')
        
        if (attempt < maxRetries && isNetworkError) {
          // Exponential backoff with jitter
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          const jitter = Math.random() * 500
          const totalDelay = delay + jitter
          
          setState(prev => ({ 
            ...prev, 
            error: `Connection issue, retrying in ${Math.round(totalDelay/1000)}s...`,
            isConnected: false,
            retryCount: attempt + 1
          }))
          
          setTimeout(() => {
            if (mounted && currentController) fetchCount(attempt + 1)
          }, totalDelay)
        } else {
          // Max retries reached or non-recoverable error
          setState(prev => ({ 
            ...prev, 
            error: attempt >= maxRetries ? 'Connection failed. Check your network.' : error.message,
            isConnected: false,
            retryCount: attempt + 1
          }))
        }
      }
    }

    fetchCount()

    return () => {
      mounted = false
      if (currentController) {
        currentController.abort()
        currentController = null
      }
    }
  }, [user?.id, store])

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
    queueCount: store.queueCount, // Remove debouncing for real-time updates
    updateQueueCount,
    incrementQueue,
    error: state.error,
    isConnected: state.isConnected
  }
}