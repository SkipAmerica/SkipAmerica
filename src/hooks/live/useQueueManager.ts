import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'

interface QueueManagerState {
  queueCount: number
  hapticsEnabled: boolean
  lastHapticTime?: number
  hapticsSuppressedUntil?: number
}

export function useQueueManager(isLive: boolean) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [queueState, setQueueState] = useState<QueueManagerState>({
    queueCount: 0,
    hapticsEnabled: true
  })

  // Subscribe to real-time queue updates
  useEffect(() => {
    if (!user || !isLive) {
      setQueueState(prev => ({ ...prev, queueCount: 0 }))
      return
    }

    const channel = supabase
      .channel('live-queue-updates')
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
          
          // Show heating up toast for multiple joins
          if (queueState.queueCount > 3) {
            toast({
              title: "Multiple joins — queue is heating up.",
              duration: 3000,
              className: "fixed bottom-20 left-4 right-4 z-50"
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
        (payload) => {
          console.log('Queue leave:', payload)
          setQueueState(prev => ({
            ...prev,
            queueCount: Math.max(0, prev.queueCount - 1)
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isLive, queueState.queueCount, toast])

  // Initial queue count fetch when going live
  useEffect(() => {
    if (!user || !isLive) return

    const fetchQueueCount = async () => {
      const { count } = await supabase
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'waiting')

      if (count !== null) {
        setQueueState(prev => ({ ...prev, queueCount: count }))
      }
    }

    fetchQueueCount()
  }, [user, isLive])

  const updateQueueCount = useCallback((count: number) => {
    setQueueState(prev => ({ ...prev, queueCount: count }))
  }, [])

  const incrementQueue = useCallback(() => {
    const now = Date.now()
    const shouldTriggerHaptic = queueState.hapticsEnabled && 
      (!queueState.lastHapticTime || now - queueState.lastHapticTime > 5000) &&
      (!queueState.hapticsSuppressedUntil || now > queueState.hapticsSuppressedUntil)

    if (shouldTriggerHaptic && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(50) // Light haptic feedback
    }

    setQueueState(prev => {
      const newCount = prev.queueCount + 1
      const recentJoins = 1 // This should track joins in last 10s in real implementation
      
      let hapticsSuppressedUntil = prev.hapticsSuppressedUntil
      if (recentJoins > 3) {
        hapticsSuppressedUntil = now + 60000 // Suppress for 60s
      }

      return {
        ...prev,
        queueCount: newCount,
        lastHapticTime: shouldTriggerHaptic ? now : prev.lastHapticTime,
        hapticsSuppressedUntil
      }
    })
  }, [queueState])

  return {
    queueCount: queueState.queueCount,
    updateQueueCount,
    incrementQueue
  }
}