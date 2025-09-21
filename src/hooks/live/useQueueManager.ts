import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/shared/hooks/use-debounce'

interface QueueManagerState {
  queueCount: number
  hapticsEnabled: boolean
  lastHapticTime?: number
  hapticsSuppressedUntil?: number
  error?: string
}

interface QueueEntry {
  id: string
  creator_id: string
  fan_id: string
  status: 'waiting' | 'in_call' | 'completed' | 'cancelled'
  created_at: string
}

export function useQueueManager(isLive: boolean) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [queueState, setQueueState] = useState<QueueManagerState>({
    queueCount: 0,
    hapticsEnabled: true
  })
  
  const channelRef = useRef<any>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const debouncedQueueCount = useDebounce(queueState.queueCount, 100)

  // Subscribe to real-time queue updates with error handling
  useEffect(() => {
    if (!user || !isLive) {
      setQueueState(prev => ({ ...prev, queueCount: 0, error: undefined }))
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const setupChannel = () => {
      const channel = supabase
        .channel(`live-queue-updates-${user.id}`, {
          config: { 
            presence: { key: user.id },
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_queue',
            filter: `creator_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Queue join:', payload)
            incrementQueue()
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
          (payload) => {
            console.log('Queue leave:', payload)
            setQueueState(prev => ({
              ...prev,
              queueCount: Math.max(0, prev.queueCount - 1),
              error: undefined
            }))
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setQueueState(prev => ({ ...prev, error: undefined }))
            console.log('Real-time queue updates connected')
          } else if (status === 'CHANNEL_ERROR') {
            setQueueState(prev => ({ 
              ...prev, 
              error: 'Real-time connection failed' 
            }))
            // Retry after 5 seconds
            retryTimeoutRef.current = setTimeout(setupChannel, 5000)
          }
        })

      channelRef.current = channel
    }

    setupChannel()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [user, isLive]) // Removed queueCount dependency to fix race condition

  // Initial queue count fetch when going live with retry logic
  useEffect(() => {
    if (!user || !isLive) return

    const fetchQueueCount = async (retryCount = 0) => {
      try {
        const { count, error } = await supabase
          .from('call_queue')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'waiting')

        if (error) throw error

        if (count !== null) {
          setQueueState(prev => ({ 
            ...prev, 
            queueCount: count,
            error: undefined 
          }))
        }
      } catch (error) {
        console.error('Error fetching queue count:', error)
        
        if (retryCount < 3) {
          setTimeout(() => fetchQueueCount(retryCount + 1), 2000)
        } else {
          setQueueState(prev => ({ 
            ...prev, 
            error: 'Failed to load queue count' 
          }))
        }
      }
    }

    fetchQueueCount()
  }, [user, isLive])

  const updateQueueCount = useCallback((count: number) => {
    setQueueState(prev => ({ ...prev, queueCount: count }))
  }, [])

  const incrementQueue = useCallback(() => {
    setQueueState(prev => {
      const now = Date.now()
      const shouldTriggerHaptic = prev.hapticsEnabled && 
        (!prev.lastHapticTime || now - prev.lastHapticTime > 5000) &&
        (!prev.hapticsSuppressedUntil || now > prev.hapticsSuppressedUntil)

      if (shouldTriggerHaptic && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate(50) // Light haptic feedback
      }

      const newCount = prev.queueCount + 1
      
      // Show heating up toast for multiple joins using functional closure
      if (newCount > 3) {
        toast({
          title: "Multiple joins — queue is heating up.",
          duration: 3000,
          className: "fixed bottom-20 left-4 right-4 z-50"
        })
      }

      return {
        ...prev,
        queueCount: newCount,
        lastHapticTime: shouldTriggerHaptic ? now : prev.lastHapticTime,
        error: undefined
      }
    })
  }, [toast]) // Removed queueState dependency to prevent stale closures

  return {
    queueCount: debouncedQueueCount,
    updateQueueCount,
    incrementQueue,
    error: queueState.error,
    isConnected: !queueState.error
  }
}