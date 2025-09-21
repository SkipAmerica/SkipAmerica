import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'

interface LiveStatusState {
  isLive: boolean
  startedAt?: string
  callsTaken: number
  totalEarningsCents: number
  queueCount: number
  rightDisplayMode: 'time' | 'earnings' // Toggle between time and earnings display
  sessionId?: string
  hapticsEnabled: boolean
  lastHapticTime?: number
  hapticsSuppressedUntil?: number
}

export const useLiveStatus = () => {
  const { user } = useAuth()
  const [liveStatus, setLiveStatus] = useLocalStorage<LiveStatusState>('live-status', {
    isLive: false,
    callsTaken: 0,
    totalEarningsCents: 0,
    queueCount: 0,
    rightDisplayMode: 'time',
    hapticsEnabled: true
  })

  const [isTransitioning, setIsTransitioning] = useState(false)
  const lastToggleAtRef = useRef<number>(0)
  const toggleLockRef = useRef<boolean>(false)
 
  // Calculate elapsed time
  const getElapsedTime = useCallback(() => {
    if (!liveStatus.startedAt) return '00:00'
    
    const start = new Date(liveStatus.startedAt)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000)
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [liveStatus.startedAt])

  // Format earnings display
  const getEarningsDisplay = useCallback(() => {
    const dollars = Math.floor(liveStatus.totalEarningsCents / 100)
    return `${liveStatus.callsTaken} / $${dollars}`
  }, [liveStatus.callsTaken, liveStatus.totalEarningsCents])

  const goLive = useCallback(async () => {
    if (!user) return

    const nowMs = Date.now()
    if (toggleLockRef.current || isTransitioning || liveStatus.isLive || nowMs - lastToggleAtRef.current < 400) {
      console.log('[live] goLive ignored (locked/transitioning/already live/cooldown)')
      return
    }
    toggleLockRef.current = true
    lastToggleAtRef.current = nowMs
    setIsTransitioning(true)
    console.log('[live] goLive start')

    const now = new Date().toISOString()
    
    // Set UI state to live immediately for better UX
    setLiveStatus(prev => ({
      ...prev,
      isLive: true,
      startedAt: now,
      callsTaken: 0,
      totalEarningsCents: 0,
      queueCount: 0
    }))
    
    // Try to create live session in database
    try {
      const { data: session, error } = await supabase
        .from('live_sessions')
        .insert({
          creator_id: user.id,
          started_at: now
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating live session:', error)
        // Don't reset UI state - let user continue with local session
      } else {
        // Update with session ID if database operation succeeded
        setLiveStatus(prev => ({
          ...prev,
          sessionId: session.id
        }))
      }
    } catch (error) {
      console.error('Error creating live session:', error)
      // Don't reset UI state - let user continue with local session
    } finally {
      setTimeout(() => {
        toggleLockRef.current = false
        setIsTransitioning(false)
      }, 350)
      console.log('[live] goLive end')
    }

    // Announce to screen readers
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Live mode on')
      utterance.volume = 0
      window.speechSynthesis.speak(utterance)
    }
  }, [user, setLiveStatus, isTransitioning, liveStatus])

  const endLive = useCallback(async () => {
    if (!user || !liveStatus.isLive) return

    const nowMs = Date.now()
    if (toggleLockRef.current || isTransitioning || nowMs - lastToggleAtRef.current < 400) {
      console.log('[live] endLive ignored (locked/transitioning/cooldown)')
      return
    }
    toggleLockRef.current = true
    lastToggleAtRef.current = nowMs
    setIsTransitioning(true)
    console.log('[live] endLive start')

    const now = new Date().toISOString()
    const startTime = liveStatus.startedAt ? new Date(liveStatus.startedAt) : new Date()
    const sessionDuration = Math.floor((new Date(now).getTime() - startTime.getTime()) / 60000)

    // Always reset UI state first, regardless of database operations
    setLiveStatus(prev => ({
      ...prev,
      isLive: false,
      sessionId: undefined,
      startedAt: undefined,
      callsTaken: 0,
      totalEarningsCents: 0,
      queueCount: 0
    }))

    // Try to update database, but don't block UI state reset
    try {
      if (liveStatus.sessionId) {
        await supabase
          .from('live_sessions')
          .update({
            ended_at: now,
            calls_taken: liveStatus.callsTaken,
            total_earnings_cents: liveStatus.totalEarningsCents,
            queue_peak_count: liveStatus.queueCount,
            session_duration_minutes: sessionDuration
          })
          .eq('id', liveStatus.sessionId)
      }
    } catch (error) {
      console.error('Error ending live session in database:', error)
      // UI state is already reset, so this won't block the user
    } finally {
      setTimeout(() => {
        toggleLockRef.current = false
        setIsTransitioning(false)
      }, 350)
      console.log('[live] endLive end')
    }
  }, [user, liveStatus, setLiveStatus, isTransitioning])

  const toggleRightDisplay = useCallback(() => {
    setLiveStatus(prev => ({
      ...prev,
      rightDisplayMode: prev.rightDisplayMode === 'time' ? 'earnings' : 'time'
    }))
  }, [setLiveStatus])

  const incrementCall = useCallback((earningsCents: number) => {
    setLiveStatus(prev => ({
      ...prev,
      callsTaken: prev.callsTaken + 1,
      totalEarningsCents: prev.totalEarningsCents + earningsCents
    }))
  }, [setLiveStatus])

  const updateQueueCount = useCallback((count: number) => {
    setLiveStatus(prev => ({
      ...prev,
      queueCount: count
    }))
  }, [setLiveStatus])

  const incrementQueue = useCallback(() => {
    const now = Date.now()
    const shouldTriggerHaptic = liveStatus.hapticsEnabled && 
      (!liveStatus.lastHapticTime || now - liveStatus.lastHapticTime > 5000) &&
      (!liveStatus.hapticsSuppressedUntil || now > liveStatus.hapticsSuppressedUntil)

    if (shouldTriggerHaptic && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(50) // Light haptic feedback
    }

    setLiveStatus(prev => {
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
  }, [liveStatus, setLiveStatus])

  return {
    isLive: liveStatus.isLive,
    startedAt: liveStatus.startedAt,
    callsTaken: liveStatus.callsTaken,
    totalEarningsCents: liveStatus.totalEarningsCents,
    queueCount: liveStatus.queueCount,
    rightDisplayMode: liveStatus.rightDisplayMode,
    sessionId: liveStatus.sessionId,
    elapsedTime: getElapsedTime(),
    earningsDisplay: getEarningsDisplay(),
    isTransitioning,
    goLive,
    endLive,
    toggleRightDisplay,
    incrementCall,
    updateQueueCount,
    incrementQueue
  }
}