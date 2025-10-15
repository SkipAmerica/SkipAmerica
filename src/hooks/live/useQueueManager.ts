/**
 * Queue manager - now integrates with centralized store
 * With enterprise-grade stability, observability, and defense-in-depth
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useLiveStore } from '@/stores/live-store'

// Gated logging for observability (dev only)
const DEBUG = import.meta.env.DEV
const log = (msg: string, data?: any) => {
  if (DEBUG) console.log(`[useQueueManager] ${msg}`, data)
}

interface QueueManagerState {
  error?: string
}

export function useQueueManager(isLive: boolean, isDiscoverable: boolean = false) {
  const { user } = useAuth()
  const { toast } = useToast()
  const store = useLiveStore()
  const channelRef = useRef<any>()
  const subscriptionRef = useRef<any>(null) // Guard against duplicate subscriptions
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Use refs to avoid triggering effect re-runs
  const retryCountRef = useRef(0)
  const lastFetchTimeRef = useRef(0)
  const isConnectedRef = useRef(false)
  const fetchInProgressRef = useRef(false)
  
  const [state, setState] = useState<QueueManagerState>({})
  
  // Retry infrastructure for guarded reconnection
  const lastStatusRef = useRef<string | null>(null)
  const retryScheduledRef = useRef(false)
  const [retryVersion, setRetryVersion] = useState(0)
  
  const scheduleRetry = useCallback(() => {
    if (retryScheduledRef.current) {
      log('SCHEDULE_RETRY:SKIP - already scheduled')
      return
    }
    retryScheduledRef.current = true

    const delay = Math.min(250 * Math.pow(2, retryCountRef.current), 15000)
    retryCountRef.current += 1

    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)

    log('SCHEDULE_RETRY:EXECUTE', { delay, retryCount: retryCountRef.current })
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = undefined
      retryScheduledRef.current = false
      setRetryVersion(v => v + 1) // Triggers effect ONCE
    }, delay)
  }, [])

  // Real-time subscription for queue changes with defense-in-depth guard
  useEffect(() => {
    if (!user) return
    
    // Defense-in-depth: Prevent duplicate subscriptions
    if (subscriptionRef.current) {
      log('SUBSCRIBE:SKIP - Already subscribed', { userId: user.id })
      return
    }

    log('SUBSCRIBE:INIT', { 
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
          log('INSERT', { payload, timestamp: performance.now() })
          
          // Fetch current queue count to avoid stale closure
          const { count } = await supabase
            .from('call_queue')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'waiting')
          
          const currentCount = count || 0
          log('INSERT:COUNT_UPDATE', { currentCount, timestamp: performance.now() })
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
          log('DELETE', { timestamp: performance.now() })
          
          // Fetch current queue count to avoid stale closure
          const { count } = await supabase
            .from('call_queue')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('status', 'waiting')
          
          const currentCount = count || 0
          log('DELETE:COUNT_UPDATE', { currentCount, timestamp: performance.now() })
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
        log('CHANNEL_ERROR', { error, timestamp: performance.now() })
        setState(prev => ({ ...prev, error: 'Connection lost' }))
        isConnectedRef.current = false
        
        // Retry subscription after delay with exponential backoff
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }
        retryCountRef.current++
        const delay = Math.min(250 * Math.pow(2, retryCountRef.current), 15000)
        log('CHANNEL_ERROR:RETRY', { delay, retryCount: retryCountRef.current })
        retryTimeoutRef.current = setTimeout(() => {
          log('CHANNEL_ERROR:RETRY_EXECUTE')
          channel.subscribe()
        }, delay)
      })
      .subscribe((status) => {
        log('SUBSCRIBE:STATUS', { status, timestamp: performance.now() })

        // Ignore duplicate status emissions
        if (status === lastStatusRef.current) return
        lastStatusRef.current = status

        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0
          retryScheduledRef.current = false
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
          isConnectedRef.current = true
          setState(prev => ({ ...prev, error: undefined, isConnected: true }))
          log('✅ SUBSCRIBED')
          return
        }

        if (status === 'CLOSED' || status === 'TIMED_OUT') {
          log('⚠️ CHANNEL CLOSED — scheduling retry', { status })
          isConnectedRef.current = false
          setState(prev => ({ ...prev, error: 'Reconnecting...', isConnected: false }))

          // Drop our reference (Supabase handles internal cleanup)
          try { supabase.removeChannel(channel) } catch {}
          channelRef.current = null
          // DO NOT null subscriptionRef here - keep defense guard active

          scheduleRetry() // One guarded retry only
          return
        }
      })

    channelRef.current = channel
    subscriptionRef.current = channel // Mark as subscribed
    isConnectedRef.current = true
    log('SUBSCRIBE:COMPLETE')

    return () => {
      log('SUBSCRIBE:CLEANUP', { userId: user.id, timestamp: performance.now() })
      lastStatusRef.current = null
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      retryScheduledRef.current = false
      if (channelRef.current) {
        if ((window as any).__allow_ch_teardown) {
          try { supabase.removeChannel(channelRef.current); } catch {}
        } else {
          log('PQ-GUARD prevented removeChannel');
        }
        channelRef.current = null
      }
      subscriptionRef.current = null
      isConnectedRef.current = false
    }
  }, [user?.id, retryVersion, scheduleRetry])

  // Fetch initial queue count with enhanced error recovery and proper abort handling
  const abortControllerRef = useRef<AbortController | null>(null)
  
  useEffect(() => {
    if (!user) return

    const now = Date.now()
    const timeSinceLastFetch = now - lastFetchTimeRef.current
    
    log('FETCH:TRIGGER', {
      userId: user.id,
      timeSinceLastFetch,
      fetchInProgress: fetchInProgressRef.current,
      timestamp: performance.now()
    })
    
    // Prevent overlapping fetches and debounce rapid calls
    if (fetchInProgressRef.current || timeSinceLastFetch < 2000) {
      log('FETCH:SKIP', { 
        fetchInProgress: fetchInProgressRef.current,
        timeSinceLastFetch 
      })
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      log('FETCH:ABORT_PREVIOUS')
      abortControllerRef.current.abort()
    }

    log('FETCH:CREATE_CONTROLLER')
    abortControllerRef.current = new AbortController()
    fetchInProgressRef.current = true
    let mounted = true

    const fetchCount = async (attempt: number = 0) => {
      if (!mounted || !abortControllerRef.current) {
        log('FETCH:EARLY_EXIT', { mounted, hasController: !!abortControllerRef.current })
        return
      }

      log('FETCH:ATTEMPT', { 
        attempt, 
        userId: user.id,
        timestamp: performance.now()
      })

      const maxRetries = 3
      const baseDelay = 2000
      const maxDelay = 10000

      try {
        lastFetchTimeRef.current = now
        log('FETCH:EXECUTE')
        const { count, error } = await supabase
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'waiting')
          .order('priority', { ascending: false })
          .order('joined_at', { ascending: true })
          .abortSignal(abortControllerRef.current.signal)

        log('FETCH:COMPLETE', { success: !error, count, timestamp: performance.now() })

        if (!mounted || !abortControllerRef.current) {
          log('FETCH:UNMOUNTED')
          return
        }

        if (error && error.code !== 'PGRST116') { // Ignore empty result errors
          throw new Error(`Database error: ${error.message}`)
        }

        // Success - reset retry count and update state
        const currentCount = count || 0
        log('FETCH:SUCCESS', { currentCount, timestamp: performance.now() })
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
          log('FETCH:ABORTED', { 
            mounted, 
            hasController: !!abortControllerRef.current,
            timestamp: performance.now()
          })
          fetchInProgressRef.current = false
          return
        }
        
        log('FETCH:ERROR', { attempt: attempt + 1, error: error.message })
        
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
      log('FETCH:CLEANUP', { userId: user.id, timestamp: performance.now() })
      mounted = false
      fetchInProgressRef.current = false
      if (abortControllerRef.current) {
        log('FETCH:ABORT_CLEANUP')
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