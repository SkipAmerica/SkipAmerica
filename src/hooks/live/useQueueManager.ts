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
}

export function useQueueManager(isLive: boolean, isDiscoverable: boolean = false) {
  const { user } = useAuth()
  const { toast } = useToast()
  const store = useLiveStore()
  const channelRef = useRef<any>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Use refs to avoid triggering effect re-runs
  const retryCountRef = useRef(0)
  const lastFetchTimeRef = useRef(0)
  const isConnectedRef = useRef(false)
  const fetchInProgressRef = useRef(false)
  
  const [state, setState] = useState<QueueManagerState>({})

  // Real-time subscription for queue changes
  useEffect(() => {
    if (!user) return

    console.log('[useQueueManager:SUBSCRIBE] Setting up realtime subscription', { 
      userId: user.id,
      timestamp: performance.now()
    })

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
          console.log('[useQueueManager:INSERT] Queue INSERT event received', { 
            payload, 
            timestamp: performance.now() 
          })
          
          // Fetch current queue count to avoid stale closure
          const { count } = await supabase
            .from('call_queue')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'waiting')
          
          const currentCount = count || 0
          console.log('[useQueueManager:INSERT] Person joined - Updated queue count immediately:', currentCount, { 
            timestamp: performance.now() 
          })
          store.updateQueueCount(currentCount)
          
          // Force immediate visual update by dispatching a custom event
          window.dispatchEvent(new CustomEvent('queue-count-updated', { 
            detail: { count: currentCount, type: 'join' }
          }))
          
          store.triggerHaptic()
          
          setState(prev => ({ ...prev, error: undefined }))
          isConnectedRef.current = true
          
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
          console.log('[useQueueManager:DELETE] Queue DELETE event received', { 
            timestamp: performance.now() 
          })
          
          // Fetch current queue count to avoid stale closure
          const { count } = await supabase
            .from('call_queue')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'waiting')
          
          const currentCount = count || 0
          console.log('[useQueueManager:DELETE] Person left - Updated queue count immediately:', currentCount, { 
            timestamp: performance.now() 
          })
          store.updateQueueCount(currentCount)
          
          // Force immediate visual update by dispatching a custom event
          window.dispatchEvent(new CustomEvent('queue-count-updated', { 
            detail: { count: currentCount, type: 'leave' }
          }))
          
          setState(prev => ({ ...prev, error: undefined }))
          isConnectedRef.current = true
        }
      )
      .on('system', { event: 'CHANNEL_ERROR' }, (error) => {
        console.error('[useQueueManager:CHANNEL_ERROR] Queue subscription error:', { 
          error, 
          timestamp: performance.now() 
        })
        setState(prev => ({ ...prev, error: 'Connection lost' }))
        isConnectedRef.current = false
        
        // Retry subscription after delay
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }
        retryCountRef.current++
        console.log('[useQueueManager:CHANNEL_ERROR] Retrying subscription in 5s')
        retryTimeoutRef.current = setTimeout(() => {
          console.log('[useQueueManager:CHANNEL_ERROR] Retry timeout fired, resubscribing')
          channel.subscribe()
        }, 5000)
      })
      .subscribe((status) => {
        console.log('[useQueueManager:SUBSCRIBE] Channel status:', { 
          status, 
          timestamp: performance.now() 
        })
      })

    channelRef.current = channel
    isConnectedRef.current = true
    console.log('[useQueueManager:SUBSCRIBE] Subscription setup complete')

    return () => {
      console.log('[useQueueManager:SUBSCRIBE] Cleaning up subscription', { 
        userId: user.id, 
        timestamp: performance.now() 
      })
      if (channelRef.current) {
        if ((window as any).__allow_ch_teardown) {
          try { supabase.removeChannel(channelRef.current); } catch {}
        } else {
          console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
        }
        channelRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = undefined
      }
      isConnectedRef.current = false
    }
  }, [user?.id]) // ONLY depend on stable user ID

  // Fetch initial queue count with enhanced error recovery and proper abort handling
  const abortControllerRef = useRef<AbortController | null>(null)
  
  useEffect(() => {
    if (!user) return

    const now = Date.now()
    const timeSinceLastFetch = now - lastFetchTimeRef.current
    
    console.log('[useQueueManager:FETCH] Effect triggered', {
      userId: user.id,
      timeSinceLastFetch,
      lastFetchTime: lastFetchTimeRef.current,
      fetchInProgress: fetchInProgressRef.current,
      timestamp: performance.now()
    })
    
    // Prevent overlapping fetches and debounce rapid calls
    if (fetchInProgressRef.current || timeSinceLastFetch < 2000) {
      console.log('[useQueueManager:FETCH] Skipping fetch', { 
        fetchInProgress: fetchInProgressRef.current,
        timeSinceLastFetch 
      })
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      console.log('[useQueueManager:FETCH] Aborting previous request')
      abortControllerRef.current.abort()
    }

    console.log('[useQueueManager:FETCH] Creating new AbortController')
    abortControllerRef.current = new AbortController()
    fetchInProgressRef.current = true
    let mounted = true

    const fetchCount = async (attempt: number = 0) => {
      if (!mounted || !abortControllerRef.current) {
        console.log('[useQueueManager:FETCH] Early exit', { mounted, hasController: !!abortControllerRef.current })
        return
      }

      console.log('[useQueueManager:FETCH] Starting fetch attempt', { 
        attempt, 
        userId: user.id,
        timestamp: performance.now()
      })

      const maxRetries = 3
      const baseDelay = 2000
      const maxDelay = 10000

      try {
        lastFetchTimeRef.current = now
        console.log('[useQueueManager:FETCH] Updated lastFetchTime:', now)
        
        console.log('[useQueueManager:FETCH] Executing Supabase query')
        const { count, error } = await supabase
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'waiting')
          .order('priority', { ascending: false })
          .order('joined_at', { ascending: true })
          .abortSignal(abortControllerRef.current.signal)

        console.log('[useQueueManager:FETCH] Query complete', { 
          success: !error, 
          count, 
          timestamp: performance.now() 
        })

        if (!mounted || !abortControllerRef.current) {
          console.log('[useQueueManager:FETCH] Component unmounted, ignoring result')
          return
        }

        if (error && error.code !== 'PGRST116') { // Ignore empty result errors
          throw new Error(`Database error: ${error.message}`)
        }

        // Success - reset retry count and update state
        const currentCount = count || 0
        console.log('[useQueueManager:FETCH] Fetched initial count from DB:', currentCount, { 
          timestamp: performance.now() 
        })
        store.updateQueueCount(currentCount)
        
        // Force immediate visual update
        window.dispatchEvent(new CustomEvent('queue-count-updated', { 
          detail: { count: currentCount, type: 'initial' }
        }))
        
        setState(prev => ({ ...prev, error: undefined }))
        isConnectedRef.current = true
        retryCountRef.current = 0
        fetchInProgressRef.current = false
        
      } catch (error: any) {
        // Ignore AbortError - this is normal cleanup
        if (!mounted || !abortControllerRef.current || error.name === 'AbortError') {
          console.log('[useQueueManager:FETCH] Request aborted (normal cleanup)', { 
            mounted, 
            hasController: !!abortControllerRef.current,
            timestamp: performance.now()
          })
          fetchInProgressRef.current = false
          return
        }
        
        console.warn(`[useQueueManager:FETCH] Fetch attempt ${attempt + 1} failed:`, error.message, { 
          timestamp: performance.now() 
        })
        
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
            error: `Connection issue, retrying in ${Math.round(totalDelay/1000)}s...`
          }))
          isConnectedRef.current = false
          retryCountRef.current = attempt + 1
          
          setTimeout(() => {
            if (mounted && abortControllerRef.current) fetchCount(attempt + 1)
          }, totalDelay)
        } else {
          // Max retries reached or non-recoverable error
          setState(prev => ({ 
            ...prev, 
            error: attempt >= maxRetries ? 'Connection failed. Check your network.' : error.message
          }))
          isConnectedRef.current = false
          retryCountRef.current = attempt + 1
          fetchInProgressRef.current = false
        }
      }
    }

    fetchCount()

    return () => {
      console.log('[useQueueManager:FETCH] Cleanup effect', { 
        userId: user.id, 
        timestamp: performance.now() 
      })
      mounted = false
      fetchInProgressRef.current = false
      if (abortControllerRef.current) {
        console.log('[useQueueManager:FETCH] Aborting controller on cleanup')
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [user?.id]) // ONLY depend on stable user ID

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
    queueCount: store.queueCount,
    updateQueueCount,
    incrementQueue,
    error: state.error,
    isConnected: isConnectedRef.current
  }
}