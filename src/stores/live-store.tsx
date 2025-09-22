import React, { createContext, useContext, useEffect, useReducer, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { transition, LiveState, LiveEvent, canGoLive, canEndLive, canInitMedia, isLive, isTransitioning } from '@/hooks/live/use-live-state-machine'
import { normalizeError, safeStringify } from '@/shared/errors/err-utils'
import { orchestrateInit, orchestrateStop, ensureMediaSubscriptions, setupMediaSubscriptions, routeMediaError, mediaManager } from '@/media/MediaOrchestrator'
import { requestWithDetail } from '@/shared/errors/network-helper'

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
  startNext: (localVideoEl: HTMLVideoElement) => Promise<void>
  confirmJoin: (localVideoEl: HTMLVideoElement, localAudioEl?: HTMLAudioElement) => Promise<void>
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
    const newState = transition(oldState, event)
    
    // Log state transition with immutable snapshot
    if ((window as any).__LIVE_DEBUG) {
      const transitionLog = {
        from: oldState,
        event: event.type,
        to: newState,
        payload: event,
        timestamp: new Date().toISOString(),
        mode: import.meta.env.MODE
      }
      console.info(`[LIVE] ${oldState} –${event.type}–> ${newState}`, safeStringify(transitionLog))
    }
    
    dispatch({ type: 'DISPATCH_EVENT', event })
    
    // Handle runtime lifecycle
    if (newState === 'SESSION_ACTIVE' && oldState !== 'SESSION_ACTIVE') {
      startRuntime()
    } else if (newState === 'OFFLINE' && oldState !== 'OFFLINE') {
      disposeRuntime()
    }
  }, [state.state, startRuntime, disposeRuntime])
  
  // GO LIVE: availability only (no media)
  const goLive = useCallback(async () => {
    if (!user || !canGoLive(state.state) || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      // Log state transition with immutable snapshot
      if ((window as any).__LIVE_DEBUG) {
        const startLog = {
          from: state.state,
          event: 'GO_LIVE',
          to: 'LIVE_AVAILABLE',
          userId: user.id,
          timestamp: new Date().toISOString(),
          mode: import.meta.env.MODE
        }
        console.info(`[LIVE] ${state.state} –GO_LIVE–> LIVE_AVAILABLE`, safeStringify(startLog))
      }
      
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

      // TODO: replace placeholders with your signaling
      // const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      // send offer to server; receive answer; await pc.setRemoteDescription(answer);

    } catch (e) {
      console.error('[LIVE][CONFIRM_JOIN] Failed:', e);
      routeMediaError(e);
      // Roll back cleanly to PREP so the creator can retry or pick another caller
      await orchestrateStop('join_failed');
      handleDispatch({ type: 'ENTER_PREP' }); // back to SESSION_PREP
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' });
    }
  }, [user, state.state, state.inFlight.start, handleDispatch, supabase])

  // END/STOP: full release
  const endLive = useCallback(async () => {
    if (!user || !canEndLive(state.state) || state.inFlight.end || !state.sessionId) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'end', controller })
    
    try {
      console.info('[LIVE][END] Ending live session...');
      
      handleDispatch({ type: 'TEARDOWN_INTENT' });
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
      
      handleDispatch({ type: 'LIVE_AVAILABLE' }); // stay live for next caller, or OFFLINE if you prefer
      console.info('[LIVE][END] Session ended, back to available');
      
    } catch (error) {
      console.error('[LIVE][END] End session failed:', error);
      // Force cleanup
      try {
        await orchestrateStop('force_cleanup');
        handleDispatch({ type: 'LIVE_AVAILABLE' });
      } catch (cleanupError) {
        console.error('[LIVE][END] Force cleanup failed:', cleanupError);
        handleDispatch({ type: 'OFFLINE' });
      }
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' });
    }
  }, [user, state.state, state.inFlight.end, state.sessionId, state.startedAt, state.callsTaken, state.totalEarningsCents, handleDispatch, supabase])
    if ((window as any).__LIVE_DEBUG) {
      const endLog = {
        from: state.state,
        event: 'END_LIVE',
        to: 'ENDING',
        sessionId: state.sessionId,
        timestamp: new Date().toISOString(),
        mode: import.meta.env.MODE
      }
      console.info(`[LIVE] ${state.state} –END_LIVE–> ENDING`, safeStringify(endLog))
    }
    
    handleDispatch({ type: 'END_LIVE' })
    
    try {
      // Step 1: Teardown media devices immediately
      try {
        console.info('[LIVE][END] Tearing down media devices...');
        await orchestrateStop('user_end')
        console.info('[LIVE][END] Media devices torn down');
      } catch (mediaError) {
        const normalized = normalizeError(mediaError, {
          step: 'teardown_media',
          state: state.state,
          event: 'END_LIVE',
          sessionId: state.sessionId,
          userId: user.id
        });
        console.error('[LIVE][END_FAILED]', safeStringify(normalized));
        // Continue with end process even if media teardown fails
      }

      // Step 2: Stop runtime services
      try {
        console.info('[LIVE][END] Stopping runtime services...');
        // Runtime disposal happens in handleDispatch side effect
        console.info('[LIVE][END] Runtime services stopped');
      } catch (runtimeError) {
        const normalized = normalizeError(runtimeError, {
          step: 'stop_runtime',
          state: state.state,
          event: 'END_LIVE',
          sessionId: state.sessionId,
          userId: user.id
        });
        console.error('[LIVE][END_FAILED]', safeStringify(normalized));
        // Continue with end process even if runtime cleanup fails
      }

      // Step 3: Update live session in API
      try {
        console.info('[LIVE][END] Updating live session...');
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
          const wrappedError = new Error(`Failed to end live session: ${error.message}`)
          wrappedError.name = 'DatabaseError'
          ;(wrappedError as any).code = error.code
          throw wrappedError
        }
        
        console.info('[LIVE][END] Live session updated');
      } catch (apiError) {
        const normalized = normalizeError(apiError, {
          step: 'end_session_api',
          state: state.state,
          event: 'END_LIVE',
          sessionId: state.sessionId,
          callsTaken: state.callsTaken,
          totalEarningsCents: state.totalEarningsCents,
          userId: user.id
        });
        console.error('[LIVE][END_FAILED]', safeStringify(normalized));
        
        toast({
          title: "Failed to end live session",
          description: normalized.message || "Database update failed",
          variant: "destructive"
        });
        
        handleDispatch({ type: 'END_FAILED' });
        dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' });
        return;
      }

      // Success!  
      if ((window as any).__LIVE_DEBUG) {
        const successLog = {
          from: 'ENDING',
          event: 'SESSION_ENDED',
          to: 'OFFLINE',
          callsTaken: state.callsTaken,
          earnings: state.totalEarningsCents,
          timestamp: new Date().toISOString(),
          mode: import.meta.env.MODE
        }
        console.info(`[LIVE] ENDING –SESSION_ENDED–> OFFLINE`, safeStringify(successLog))
      }
      
      handleDispatch({ type: 'SESSION_ENDED' })
      
      toast({
        title: "Live session ended",
        description: `${state.callsTaken} calls • $${Math.floor(state.totalEarningsCents / 100)}`
      })
      
    } catch (error: any) {
      if (error.name === 'AbortError') return
      
      // Ensure media cleanup on any failure
      try {
        await orchestrateStop('end_live_failed')
      } catch (cleanupError) {
        console.warn('[LIVE][END_FAILED] Media cleanup failed:', cleanupError)
      }
      
      // Catch-all error handler
      const normalized = normalizeError(error, {
        step: 'unknown',
        state: state.state,
        event: 'END_LIVE',
        sessionId: state.sessionId,
        userId: user.id
      });
      console.error('[LIVE][END_FAILED]', safeStringify(normalized));
      
      handleDispatch({ type: 'END_FAILED' })
      
      toast({
        title: "Failed to end live session",
        description: normalized.message || "Something went wrong ending your live session.",
        variant: "destructive"
      })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' })
    }
  }, [user, state.state, state.inFlight.end, state.sessionId, state.startedAt, state.callsTaken, state.totalEarningsCents, handleDispatch, supabase, toast])
  
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
    isLive: isLive(state.state) && !state.inFlight.end,
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
    startRuntime()
    return () => disposeRuntime()
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
