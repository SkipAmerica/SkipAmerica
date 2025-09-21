import { useState, useCallback } from 'react'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'

export type LiveState = 'OFFLINE' | 'GOING_LIVE' | 'LIVE' | 'ENDING_LIVE'

interface LiveSessionState {
  state: LiveState
  startedAt?: string
  sessionId?: string
  callsTaken: number
  totalEarningsCents: number
  rightDisplayMode: 'time' | 'earnings'
}

export function useLiveSession() {
  const { user } = useAuth()
  const [sessionData, setSessionData] = useLocalStorage<LiveSessionState>('live-session', {
    state: 'OFFLINE',
    callsTaken: 0,
    totalEarningsCents: 0,
    rightDisplayMode: 'time'
  })

  const [isTransitioning, setIsTransitioning] = useState(false)

  const goLive = useCallback(async () => {
    if (!user || sessionData.state !== 'OFFLINE') return

    setSessionData(prev => ({ ...prev, state: 'GOING_LIVE' }))
    setIsTransitioning(true)

    const now = new Date().toISOString()
    
    // Update UI state immediately
    setSessionData(prev => ({
      ...prev,
      state: 'LIVE',
      startedAt: now,
      callsTaken: 0,
      totalEarningsCents: 0
    }))
    
    // Create database session
    try {
      const { data: session, error } = await supabase
        .from('live_sessions')
        .insert({
          creator_id: user.id,
          started_at: now
        })
        .select()
        .single()

      if (!error && session) {
        setSessionData(prev => ({
          ...prev,
          sessionId: session.id
        }))
      }
    } catch (error) {
      console.error('Error creating live session:', error)
      // Continue with local session
    } finally {
      setTimeout(() => {
        setIsTransitioning(false)
      }, 700)
    }

    // Accessibility announcement
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Live mode on')
      utterance.volume = 0
      window.speechSynthesis.speak(utterance)
    }
  }, [user, sessionData.state, setSessionData])

  const endLive = useCallback(async () => {
    if (!user || sessionData.state !== 'LIVE') return

    setSessionData(prev => ({ ...prev, state: 'ENDING_LIVE' }))
    setIsTransitioning(true)

    const now = new Date().toISOString()
    const startTime = sessionData.startedAt ? new Date(sessionData.startedAt) : new Date()
    const sessionDuration = Math.floor((new Date(now).getTime() - startTime.getTime()) / 60000)

    // Update UI state immediately
    setSessionData(prev => ({
      ...prev,
      state: 'OFFLINE',
      sessionId: undefined,
      startedAt: undefined,
      callsTaken: 0,
      totalEarningsCents: 0
    }))

    // Update database
    try {
      if (sessionData.sessionId) {
        await supabase
          .from('live_sessions')
          .update({
            ended_at: now,
            calls_taken: sessionData.callsTaken,
            total_earnings_cents: sessionData.totalEarningsCents,
            session_duration_minutes: sessionDuration
          })
          .eq('id', sessionData.sessionId)
      }
    } catch (error) {
      console.error('Error ending live session:', error)
    } finally {
      setTimeout(() => {
        setIsTransitioning(false)
      }, 700)
    }
  }, [user, sessionData, setSessionData])

  const toggleRightDisplay = useCallback(() => {
    setSessionData(prev => ({
      ...prev,
      rightDisplayMode: prev.rightDisplayMode === 'time' ? 'earnings' : 'time'
    }))
  }, [setSessionData])

  const incrementCall = useCallback((earningsCents: number) => {
    setSessionData(prev => ({
      ...prev,
      callsTaken: prev.callsTaken + 1,
      totalEarningsCents: prev.totalEarningsCents + earningsCents
    }))
  }, [setSessionData])

  // Calculate elapsed time
  const getElapsedTime = useCallback(() => {
    if (!sessionData.startedAt) return '00:00'
    
    const start = new Date(sessionData.startedAt)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000)
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [sessionData.startedAt])

  // Format earnings display
  const getEarningsDisplay = useCallback(() => {
    const dollars = Math.floor(sessionData.totalEarningsCents / 100)
    return `${sessionData.callsTaken} / $${dollars}`
  }, [sessionData.callsTaken, sessionData.totalEarningsCents])

  return {
    // State
    isLive: sessionData.state === 'LIVE',
    state: sessionData.state,
    startedAt: sessionData.startedAt,
    sessionId: sessionData.sessionId,
    callsTaken: sessionData.callsTaken,
    totalEarningsCents: sessionData.totalEarningsCents,
    rightDisplayMode: sessionData.rightDisplayMode,
    isTransitioning,
    
    // Computed
    elapsedTime: getElapsedTime(),
    earningsDisplay: getEarningsDisplay(),
    
    // Actions
    goLive,
    endLive,
    toggleRightDisplay,
    incrementCall
  }
}