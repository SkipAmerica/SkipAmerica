/**
 * Centralized live session store with React Context
 * Single source of truth for all live state
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { transition, LiveState, LiveEvent, canGoLive, canEndLive } from '@/hooks/live/use-live-state-machine'

interface LiveStoreState {
  // Core state machine
  state: LiveState
  
  // Session data
  startedAt: number | null
  sessionId: string | null
  callsTaken: number
  totalEarningsCents: number
  
  // UI state
  showEarnings: boolean
  
  // Queue state
  queueCount: number
  
  // Haptics state
  hapticsEnabled: boolean
  lastHapticTime: number
  hapticsSuppressedUntil: number
  
  // In-flight requests (for deduplication)
  inFlight: {
    start?: AbortController
    end?: AbortController
  }
}

type Action = 
  | { type: 'DISPATCH_EVENT'; event: LiveEvent }
  | { type: 'SET_SESSION_DATA'; sessionId: string; startedAt: number }
  | { type: 'INCREMENT_CALL'; earnings: number }
  | { type: 'TOGGLE_EARNINGS_DISPLAY' }
  | { type: 'UPDATE_QUEUE_COUNT'; count: number }
  | { type: 'SET_IN_FLIGHT'; operation: 'start' | 'end'; controller?: AbortController }
  | { type: 'TRIGGER_HAPTIC' }

const initialState: LiveStoreState = {
  state: 'OFFLINE',
  startedAt: null,
  sessionId: null,
  callsTaken: 0,
  totalEarningsCents: 0,
  showEarnings: false,
  queueCount: 0,
  hapticsEnabled: true,
  lastHapticTime: 0,
  hapticsSuppressedUntil: 0,
  inFlight: {}
}

function reducer(state: LiveStoreState, action: Action): LiveStoreState {
  switch (action.type) {
    case 'DISPATCH_EVENT': {
      const newState = transition(state.state, action.event)
      
      // Clear session data on transition to OFFLINE
      if (newState === 'OFFLINE' && state.state !== 'OFFLINE') {
        return {
          ...state,
          state: newState,
          startedAt: null,
          sessionId: null,
          callsTaken: 0,
          totalEarningsCents: 0,
          inFlight: {} // Clear in-flight requests
        }
      }
      
      return { ...state, state: newState }
    }
    
    case 'SET_SESSION_DATA':
      return {
        ...state,
        sessionId: action.sessionId,
        startedAt: action.startedAt
      }
      
    case 'INCREMENT_CALL':
      return {
        ...state,
        callsTaken: state.callsTaken + 1,
        totalEarningsCents: state.totalEarningsCents + action.earnings
      }
      
    case 'TOGGLE_EARNINGS_DISPLAY':
      return {
        ...state,
        showEarnings: !state.showEarnings
      }
      
    case 'UPDATE_QUEUE_COUNT':
      return {
        ...state,
        queueCount: action.count
      }
      
    case 'SET_IN_FLIGHT': {
      const newInFlight = { ...state.inFlight }
      if (action.controller) {
        newInFlight[action.operation] = action.controller
      } else {
        delete newInFlight[action.operation]
      }
      return {
        ...state,
        inFlight: newInFlight
      }
    }
    
    case 'TRIGGER_HAPTIC': {
      const now = Date.now()
      
      // Check if suppressed
      if (now < state.hapticsSuppressedUntil) {
        return state
      }
      
      // Check rate limit (max 1 per 5s)
      if (now - state.lastHapticTime < 5000) {
        return state
      }
      
      // Trigger haptic if supported
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator && state.hapticsEnabled) {
        navigator.vibrate(50)
      }
      
      return {
        ...state,
        lastHapticTime: now
      }
    }
    
    default:
      return state
  }
}

interface LiveStoreContextValue extends LiveStoreState {
  
  // Computed values
  isLive: boolean
  isTransitioning: boolean
  canGoLive: boolean
  canEndLive: boolean
  elapsedTime: string
  earningsDisplay: string
  
  // Actions
  dispatch: (event: LiveEvent) => void
  goLive: () => Promise<void>
  endLive: () => Promise<void>
  toggleEarningsDisplay: () => void
  incrementCall: (earnings: number) => void
  updateQueueCount: (count: number) => void
  triggerHaptic: () => void
}

const LiveStoreContext = createContext<LiveStoreContextValue | null>(null)

export function LiveStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user } = useAuth()
  const { toast } = useToast()
  const runtimeDisposeRef = useRef<(() => void) | null>(null)
  
  // Force reset to OFFLINE on mount (no localStorage auto-restore)
  useEffect(() => {
    dispatch({ type: 'DISPATCH_EVENT', event: { type: 'RESET' } })
  }, [])
  
  // Runtime lifecycle management
  const startRuntime = useCallback(() => {
    // Clear any existing runtime
    if (runtimeDisposeRef.current) {
      runtimeDisposeRef.current()
    }
    
    // Start elapsed timer
    const startTime = Date.now()
    const timerInterval = setInterval(() => {
      // Timer continues until dispose
    }, 1000)
    
    // Subscribe to queue events
    const channel = supabase
      .channel('live-queue-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_queue'
        },
        () => {
          dispatch({ type: 'TRIGGER_HAPTIC' })
        }
      )
      .subscribe()
    
    // Return dispose function
    runtimeDisposeRef.current = () => {
      clearInterval(timerInterval)
      supabase.removeChannel(channel)
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' })
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' })
    }
  }, [])
  
  const disposeRuntime = useCallback(() => {
    if (runtimeDisposeRef.current) {
      runtimeDisposeRef.current()
      runtimeDisposeRef.current = null
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeRuntime()
    }
  }, [disposeRuntime])
  
  const handleDispatch = useCallback((event: LiveEvent) => {
    const oldState = state.state
    dispatch({ type: 'DISPATCH_EVENT', event })
    
    // Handle runtime lifecycle
    const newState = transition(oldState, event)
    if (newState === 'LIVE' && oldState !== 'LIVE') {
      startRuntime()
    } else if (newState === 'OFFLINE' && oldState !== 'OFFLINE') {
      disposeRuntime()
    }
  }, [state.state, startRuntime, disposeRuntime])
  
  const goLive = useCallback(async () => {
    if (!user || !canGoLive(state.state) || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    handleDispatch({ type: 'GO_LIVE' })
    
    try {
      const now = new Date().toISOString()
      const { data: session, error } = await supabase
        .from('live_sessions')
        .insert({
          creator_id: user.id,
          started_at: now
        })
        .select()
        .single()
      
      if (error) throw error
      
      dispatch({ type: 'SET_SESSION_DATA', sessionId: session.id, startedAt: Date.now() })
      handleDispatch({ type: 'LIVE_STARTED' })
      
    } catch (error: any) {
      if (error.name === 'AbortError') return
      
      console.error('Error going live:', error)
      handleDispatch({ type: 'START_FAILED' })
      
      toast({
        title: "Failed to go live",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' })
    }
  }, [user, state.state, state.inFlight.start, handleDispatch, toast])
  
  const endLive = useCallback(async () => {
    if (!user || !canEndLive(state.state) || state.inFlight.end || !state.sessionId) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'end', controller })
    handleDispatch({ type: 'END_LIVE' })
    
    try {
      const now = new Date().toISOString()
      const sessionDuration = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 60000) : 0
      
      const { error } = await supabase
        .from('live_sessions')
        .update({
          ended_at: now,
          calls_taken: state.callsTaken,
          total_earnings_cents: state.totalEarningsCents,
          session_duration_minutes: sessionDuration
        })
        .eq('id', state.sessionId)
      
      if (error) throw error
      
      handleDispatch({ type: 'LIVE_ENDED' })
      
      toast({
        title: "Live session ended",
        description: `${state.callsTaken} calls • $${Math.floor(state.totalEarningsCents / 100)}`
      })
      
    } catch (error: any) {
      if (error.name === 'AbortError') return
      
      console.error('Error ending live:', error)
      handleDispatch({ type: 'END_FAILED' })
      
      toast({
        title: "Failed to end live session",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' })
    }
  }, [user, state.state, state.inFlight.end, state.sessionId, state.startedAt, state.callsTaken, state.totalEarningsCents, handleDispatch, toast])
  
  const toggleEarningsDisplay = useCallback(() => {
    dispatch({ type: 'TOGGLE_EARNINGS_DISPLAY' })
  }, [])
  
  const incrementCall = useCallback((earnings: number) => {
    dispatch({ type: 'INCREMENT_CALL', earnings })
  }, [])
  
  const updateQueueCount = useCallback((count: number) => {
    dispatch({ type: 'UPDATE_QUEUE_COUNT', count })
  }, [])
  
  const triggerHaptic = useCallback(() => {
    dispatch({ type: 'TRIGGER_HAPTIC' })
  }, [])
  
  // Computed values
  const elapsedTime = React.useMemo(() => {
    if (!state.startedAt) return '00:00'
    
    const now = Date.now()
    const diff = Math.floor((now - state.startedAt) / 1000)
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [state.startedAt])
  
  const earningsDisplay = React.useMemo(() => {
    const dollars = Math.floor(state.totalEarningsCents / 100)
    return `${state.callsTaken} / $${dollars}`
  }, [state.callsTaken, state.totalEarningsCents])
  
  const value: LiveStoreContextValue = {
    ...state,
    isLive: state.state === 'LIVE',
    isTransitioning: state.state === 'STARTING' || state.state === 'ENDING',
    canGoLive: canGoLive(state.state) && !state.inFlight.start,
    canEndLive: canEndLive(state.state) && !state.inFlight.end,
    elapsedTime,
    earningsDisplay,
    dispatch: handleDispatch,
    goLive,
    endLive,
    toggleEarningsDisplay,
    incrementCall,
    updateQueueCount,
    triggerHaptic
  }
  
  return (
    <LiveStoreContext.Provider value={value}>
      {children}
    </LiveStoreContext.Provider>
  )
}

export function useLiveStore() {
  const context = useContext(LiveStoreContext)
  if (!context) {
    throw new Error('useLiveStore must be used within a LiveStoreProvider')
  }
  return context
}