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
    if ((!isLive && !isDiscoverable) || !user) return

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
  }, [isLive, isDiscoverable, user, toast, store])

  // Fetch initial queue count with enhanced error recovery
  useEffect(() => {
    if ((!isLive && !isDiscoverable) || !user) return

    const now = Date.now()
    const timeSinceLastFetch = now - state.lastFetchTime
    
    // Debounce rapid successive calls (prevent spam from render loops)
    if (timeSinceLastFetch < 1000) {
      console.log('[QueueManager] Debouncing fetch request')
      return
    }

    let mounted = true
    const controller = new AbortController()

    const fetchCount = async (attempt: number = 0) => {
      if (!mounted) return

      const maxRetries = 5
      const baseDelay = 1000
      const maxDelay = 30000

      try {
        setState(prev => ({ ...prev, lastFetchTime: now }))
        
        const { count, error } = await supabase
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'waiting')
          .abortSignal(controller.signal)

        if (!mounted) return

        if (error) {
          throw new Error(`Database error: ${error.message} (${error.code})`)
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
        if (!mounted || error.name === 'AbortError') return
        
        console.warn(`[QueueManager] Fetch attempt ${attempt + 1} failed:`, error.message)
        
        const isNetworkError = error.message?.includes('503') || 
                              error.message?.includes('Failed to fetch') ||
                              error.message?.includes('NetworkError')
        
        if (attempt < maxRetries && isNetworkError) {
          // Exponential backoff with jitter
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          const jitter = Math.random() * 1000
          const totalDelay = delay + jitter
          
          setState(prev => ({ 
            ...prev, 
            error: `Connection issue, retrying in ${Math.round(totalDelay/1000)}s...`,
            isConnected: false,
            retryCount: attempt + 1
          }))
          
          setTimeout(() => {
            if (mounted) fetchCount(attempt + 1)
          }, totalDelay)
        } else {
          // Max retries reached or non-recoverable error
          setState(prev => ({ 
            ...prev, 
            error: attempt >= maxRetries ? 'Connection failed after multiple attempts' : error.message,
            isConnected: false,
            retryCount: attempt + 1
          }))
        }
      }
    }

    fetchCount()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [isLive, isDiscoverable, user?.id, store])

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