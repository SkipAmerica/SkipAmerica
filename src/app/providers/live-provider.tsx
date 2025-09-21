import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useLiveStatus } from '@/hooks/useLiveStatus'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './auth-provider'
import { useToast } from '@/components/ui/use-toast'

interface LiveContextType {
  isLive: boolean
  startedAt?: string
  callsTaken: number
  totalEarningsCents: number
  queueCount: number
  rightDisplayMode: 'time' | 'earnings'
  elapsedTime: string
  earningsDisplay: string
  isTransitioning: boolean
  goLive: () => Promise<void>
  endLive: () => Promise<void>
  toggleRightDisplay: () => void
  incrementCall: (earningsCents: number) => void
  updateQueueCount: (count: number) => void
  incrementQueue: () => void
}

const LiveContext = createContext<LiveContextType | undefined>(undefined)

interface LiveProviderProps {
  children: ReactNode
}

export function LiveProvider({ children }: LiveProviderProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const liveStatus = useLiveStatus()

  // Subscribe to real-time queue updates
  useEffect(() => {
    if (!user || !liveStatus.isLive) return

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
          liveStatus.incrementQueue()
          
          // Check if we should show the "heating up" toast
          const now = Date.now()
          if (liveStatus.queueCount > 3) {
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
          liveStatus.updateQueueCount(Math.max(0, liveStatus.queueCount - 1))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, liveStatus.isLive, liveStatus, toast])

  // Initial queue count fetch when going live
  useEffect(() => {
    if (!user || !liveStatus.isLive) return

    const fetchQueueCount = async () => {
      const { count } = await supabase
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'waiting')

      if (count !== null) {
        liveStatus.updateQueueCount(count)
      }
    }

    fetchQueueCount()
  }, [user, liveStatus.isLive, liveStatus])

  return (
    <LiveContext.Provider value={liveStatus}>
      {children}
    </LiveContext.Provider>
  )
}

export function useLive() {
  const context = useContext(LiveContext)
  if (context === undefined) {
    throw new Error('useLive must be used within a LiveProvider')
  }
  return context
}