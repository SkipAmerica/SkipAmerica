import React, { createContext, useContext, useEffect, useReducer, useMemo, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { transition, canGoLive, canEndLive, LiveState, LiveEvent, isTransitioning } from '@/hooks/live/use-live-state-machine'
import { orchestrateInit, orchestrateStop, ensureMediaSubscriptions, routeMediaError, mediaManager, setupMediaSubscriptions } from '@/media/MediaOrchestrator'

interface LiveStoreState {
  state: LiveState
  startedAt?: number
  sessionId?: string
  callsTaken: number
  totalEarningsCents: number
  showEarnings: boolean
  queueCount: number
  hapticsEnabled: boolean
  lastHapticTime?: number
  hapticsSuppressedUntil?: number
  inFlight: {
    start: boolean
    end: boolean
  }
  error?: string
}

type Action =
  | { type: 'DISPATCH_EVENT'; event: LiveEvent }
  | { type: 'SET_SESSION_DATA'; sessionId: string; startedAt: number }
  | { type: 'INCREMENT_CALL'; earnings: number }
  | { type: 'TOGGLE_EARNINGS_DISPLAY' }
  | { type: 'SET_IN_FLIGHT'; operation: 'start' | 'end'; controller?: AbortController }
  | { type: 'UPDATE_QUEUE_COUNT'; count: number }
  | { type: 'TRIGGER_HAPTIC' }
  | { type: 'SET_HAPTICS_SUPPRESSED'; until: number }
  | { type: 'ENABLE_HAPTICS' }
  | { type: 'DISABLE_HAPTICS' }
  | { type: 'SET_ERROR'; error?: string }

const initialState: LiveStoreState = {
  state: 'OFFLINE',
  callsTaken: 0,
  totalEarningsCents: 0,
  showEarnings: false,
  queueCount: 0,
  hapticsEnabled: true,
  inFlight: {
    start: false,
    end: false
  }
}

function reducer(state: LiveStoreState, action: Action): LiveStoreState {
  switch (action.type) {
    case 'DISPATCH_EVENT':
      return {
        ...state,
        state: transition(state.state, action.event)
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
    
    case 'SET_IN_FLIGHT':
      return {
        ...state,
        inFlight: {
          ...state.inFlight,
          [action.operation]: !state.inFlight[action.operation]
        }
      }
    
    case 'UPDATE_QUEUE_COUNT':
      return {
        ...state,
        queueCount: action.count
      }
    
    case 'TRIGGER_HAPTIC':
      const now = Date.now()
      if (!state.hapticsEnabled || 
          (state.hapticsSuppressedUntil && now < state.hapticsSuppressedUntil) ||
          (state.lastHapticTime && now - state.lastHapticTime < 3000)) {
        return state
      }
      
      // Trigger haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([50, 100, 50])
      }
      
      return {
        ...state,
        lastHapticTime: now
      }
    
    case 'SET_HAPTICS_SUPPRESSED':
      return {
        ...state,
        hapticsSuppressedUntil: action.until
      }
    
    case 'ENABLE_HAPTICS':
      return {
        ...state,
        hapticsEnabled: true,
        hapticsSuppressedUntil: undefined
      }
    
    case 'DISABLE_HAPTICS':
      return {
        ...state,
        hapticsEnabled: false
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      }
    
    default:
      return state
  }
}

interface LiveStoreContextValue {
  state: LiveState
  isLive: boolean
  startedAt?: number
  sessionId?: string
  callsTaken: number
  totalEarningsCents: number
  showEarnings: boolean
  queueCount: number
  hapticsEnabled: boolean
  isTransitioning: boolean
  canGoLive: boolean
  canEndLive: boolean
  elapsedTime: string
  earningsDisplay: string
  dispatch: (event: LiveEvent) => void
  goLive: () => Promise<void>
  startNext: (localVideoEl: HTMLVideoElement) => Promise<void>
  confirmJoin: (localVideoEl: HTMLVideoElement, localAudioEl?: HTMLAudioElement) => Promise<void>
  endLive: () => Promise<void>
  toggleEarningsDisplay: () => void
  incrementCall: (earnings: number) => void
  updateQueueCount: (count: number) => void
  triggerHaptic: () => void
}

const LiveStoreContext = createContext<LiveStoreContextValue | null>(null)

interface LiveStoreProviderProps {
  children: React.ReactNode
}

export function LiveStoreProvider({ children }: LiveStoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { toast } = useToast()
  const { user } = useAuth()
  
  const handleDispatch = useCallback((event: LiveEvent) => {
    dispatch({ type: 'DISPATCH_EVENT', event })
  }, [])
  
  // Runtime management side effect
  useEffect(() => {
    const oldState = state.state
    const newState = state.state
    
    if (newState === 'SESSION_ACTIVE' && oldState !== 'SESSION_ACTIVE') {
      console.info('[LIVE] Starting runtime services...')
    } else if (newState === 'OFFLINE' && oldState !== 'OFFLINE') {
      console.info('[LIVE] Stopping runtime services...')
    }
  }, [state.state])
  
  // GO LIVE: availability only (no media)
  const goLive = useCallback(async () => {
    if (!user || !canGoLive(state.state) || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      console.info('[LIVE][GO_LIVE] Setting availability...');
      ensureMediaSubscriptions();
      handleDispatch({ type: 'GO_LIVE' }); // -> LIVE_AVAILABLE
      console.info('[LIVE][GO_LIVE] Now available for calls');
      
    } catch (error) {
      console.error('[LIVE][GO_LIVE] Failed:', error);
      handleDispatch({ type: 'START_FAILED' });
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' });
    }
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // START NEXT: enter lobby and trigger preview via subscription  
  const startNext = useCallback(async (localVideoEl: HTMLVideoElement) => {
    if (!user || state.state !== 'LIVE_AVAILABLE' || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      console.info('[LIVE][START_NEXT] Entering prep...');
      ensureMediaSubscriptions();
      
      // Store video element for orchestrator subscription
      (window as any).__skipLocalVideoEl = localVideoEl;
      
      handleDispatch({ type: 'ENTER_PREP' });
      await Promise.resolve(); // allow reducer commit → SESSION_PREP
      
      // ensureMediaSubscriptions will observe SESSION_PREP and call orchestrateInit for preview
      console.info('[LIVE][START_NEXT] Prep initiated, media will initialize via subscription');
      
    } catch (error) {
      console.error('[LIVE][START_NEXT] Failed:', error);
      handleDispatch({ type: 'START_FAILED' });
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' });
    }
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // CONFIRM JOIN: both sides agreed; upgrade to full media + RTC and move to ACTIVE on ICE connected
  const confirmJoin = useCallback(async (localVideoEl: HTMLVideoElement, localAudioEl?: HTMLAudioElement) => {
    if (!user || state.state !== 'SESSION_PREP' || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      console.info('[LIVE][CONFIRM_JOIN] Entering joining state...');
      handleDispatch({ type: 'ENTER_JOINING' }); // intent
      await Promise.resolve(); // commit → SESSION_JOINING

      await orchestrateInit({
        targetState: 'SESSION_JOINING',
        previewOnly: false,
        videoEl: localVideoEl,
        audioEl: localAudioEl,
      });

      // Create live session in API
      console.info('[LIVE][CONFIRM_JOIN] Creating live session...');
      const now = new Date().toISOString()
      const { data: session, error } = await supabase
        .from('live_sessions')
        .insert({
          creator_id: user.id,
          started_at: now
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create live session: ${error.message}`)
      }
      
      dispatch({ type: 'SET_SESSION_DATA', sessionId: session.id, startedAt: Date.now() })

      // Minimal RTC skeleton (replace signaling as needed)
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      mediaManager.setPeerConnection(pc);
      const stream = mediaManager.getLocalStream();
      stream?.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.oniceconnectionstatechange = async () => {
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') {
          handleDispatch({ type: 'SESSION_STARTED' }); // -> SESSION_ACTIVE
          console.info('[LIVE][CONFIRM_JOIN] Session fully active');
        }
        if (s === 'failed' || s === 'disconnected') {
          routeMediaError(new Error('RTC failed'));
        }
      };

    } catch (e) {
      console.error('[LIVE][CONFIRM_JOIN] Failed:', e);
      routeMediaError(e);
      // Roll back cleanly to PREP so the creator can retry or pick another caller
      await orchestrateStop('join_failed');
      handleDispatch({ type: 'ENTER_PREP' }); // back to SESSION_PREP
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' });
    }
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // END/STOP: full release
  const endLive = useCallback(async () => {
    if (!user || !canEndLive(state.state) || state.inFlight.end) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'end', controller })
    
    try {
      console.info('[LIVE][END] Ending live session...');
      
      handleDispatch({ type: 'END_LIVE' });
      await orchestrateStop('user_end');
      
      // Update session in database (if exists)
      if (state.sessionId) {
        try {
          console.info('[LIVE][END] Updating session record...');
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
          
          if (error) {
            console.warn('[LIVE][END] Failed to update session record:', error);
          } else {
            console.info('[LIVE][END] Session record updated');
          }
        } catch (dbError) {
          console.warn('[LIVE][END] Failed to update session record:', dbError);
        }
      }
      
      handleDispatch({ type: 'SESSION_ENDED' }); // ENDING -> OFFLINE
      console.info('[LIVE][END] Session ended');
      
    } catch (error) {
      console.error('[LIVE][END] End session failed:', error);
      // Force cleanup
      try {
        await orchestrateStop('force_cleanup');
        handleDispatch({ type: 'SESSION_ENDED' }); // Try to end cleanly
      } catch (cleanupError) {
        console.error('[LIVE][END] Force cleanup failed:', cleanupError);
        handleDispatch({ type: 'RESET' }); // Force reset to OFFLINE
      }
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' });
    }
  }, [user, state.state, state.inFlight.end, state.sessionId, state.startedAt, state.callsTaken, state.totalEarningsCents, handleDispatch])
  
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
  const elapsedTime = useMemo(() => {
    if (!state.startedAt) return '00:00'
    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const seconds = (elapsed % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [state.startedAt])
  
  const earningsDisplay = useMemo(() => {
    const dollars = state.totalEarningsCents / 100
    return `$${dollars.toFixed(2)}`
  }, [state.totalEarningsCents])
  
  const value: LiveStoreContextValue = {
    state: state.state,
    isLive: state.state === 'SESSION_ACTIVE',
    startedAt: state.startedAt,
    sessionId: state.sessionId,
    callsTaken: state.callsTaken,
    totalEarningsCents: state.totalEarningsCents,
    showEarnings: state.showEarnings,
    queueCount: state.queueCount,
    hapticsEnabled: state.hapticsEnabled,
    isTransitioning: isTransitioning(state.state),
    canGoLive: canGoLive(state.state) && !state.inFlight.start,
    canEndLive: canEndLive(state.state) && !state.inFlight.end,
    elapsedTime,
    earningsDisplay,
    dispatch: handleDispatch,
    goLive,
    startNext,
    confirmJoin,
    endLive,
    toggleEarningsDisplay,
    incrementCall,
    updateQueueCount,
    triggerHaptic
  }
  
  // Initialize store subscriptions and media orchestrator
  useEffect(() => {
    setupMediaSubscriptions((callback) => {
      // Simple subscription mechanism - call callback on state changes
      const unsubscribe = () => {} // Placeholder for cleanup
      callback() // Initial call
      return unsubscribe
    }, () => state)
    
    ensureMediaSubscriptions()
    return () => {
      console.info('[LIVE] Cleaning up media subscriptions...')
    }
  }, [])

  return (
    <LiveStoreContext.Provider value={value}>
      {children}
    </LiveStoreContext.Provider>
  )
}

export function useLiveStore() {
  const context = useContext(LiveStoreContext)
  if (!context) {
    const error = new Error('useLiveStore must be used within a LiveStoreProvider')
    error.name = 'ContextError'
    throw error
  }
  return context
}