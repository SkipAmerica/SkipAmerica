/**
 * Centralized Live Store using React Context + useReducer
 * Manages all live session state and media orchestration
 */
import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, ReactNode } from 'react'
import { transition, canGoLive, canEndLive, LiveState, LiveEvent, isTransitioning } from '@/hooks/live/use-live-state-machine'
import { ensureMediaSubscriptions, orchestrateInit, orchestrateStop, routeMediaError, mediaManager } from '@/media/MediaOrchestrator'
import { useAuth } from '@/app/providers/auth-provider'
import { supabase } from '@/integrations/supabase/client'

// Core state structure
export interface LiveStoreState {
  state: LiveState
  sessionId: string | null
  startedAt: number
  callsTaken: number
  totalEarningsCents: number
  showEarnings: boolean
  queueCount: number
  hapticsEnabled: boolean
  discoverableStartedAt: number | null // Timer tracking
  accumulatedDiscoverableTime: number // Persistent across sessions
  inFlight: {
    start: AbortController | null
    end: AbortController | null
  }
}

// Actions for state management
export type Action = 
  | { type: 'STATE_TRANSITION'; event: LiveEvent }
  | { type: 'SET_SESSION_DATA'; sessionId: string; startedAt: number }
  | { type: 'INCREMENT_CALL'; earnings: number }
  | { type: 'UPDATE_QUEUE_COUNT'; count: number }
  | { type: 'TOGGLE_EARNINGS' }
  | { type: 'SET_IN_FLIGHT'; operation: 'start' | 'end'; controller?: AbortController }
  | { type: 'TRIGGER_HAPTIC' }
  | { type: 'START_DISCOVERABLE_TIMER' }
  | { type: 'STOP_DISCOVERABLE_TIMER' }
  | { type: 'RESET_TIMER' }

const initialState: LiveStoreState = {
  state: 'OFFLINE',
  sessionId: null,
  startedAt: 0,
  callsTaken: 0,
  totalEarningsCents: 0,
  showEarnings: false,
  queueCount: 0,
  hapticsEnabled: true,
  discoverableStartedAt: null,
  accumulatedDiscoverableTime: 0,
  inFlight: {
    start: null,
    end: null
  }
}

function reducer(state: LiveStoreState, action: Action): LiveStoreState {
  switch (action.type) {
    case 'STATE_TRANSITION': {
      const newState = transition(state.state, action.event)
      let updates: Partial<LiveStoreState> = { state: newState }
      
      // Handle timer logic based on state changes
      if (state.state !== 'DISCOVERABLE' && newState === 'DISCOVERABLE') {
        // Starting discoverable
        updates.discoverableStartedAt = Date.now()
      } else if (state.state === 'DISCOVERABLE' && newState === 'OFFLINE') {
        // Going offline - accumulate time
        if (state.discoverableStartedAt) {
          updates.accumulatedDiscoverableTime = state.accumulatedDiscoverableTime + 
            (Date.now() - state.discoverableStartedAt)
        }
        updates.discoverableStartedAt = null
      }
      
      return { ...state, ...updates }
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
    
    case 'UPDATE_QUEUE_COUNT':
      return { ...state, queueCount: action.count }
    
    case 'TOGGLE_EARNINGS':
      return { ...state, showEarnings: !state.showEarnings }
    
    case 'SET_IN_FLIGHT':
      return {
        ...state,
        inFlight: {
          ...state.inFlight,
          [action.operation]: action.controller || null
        }
      }
    
    case 'TRIGGER_HAPTIC':
      // TODO: Implement haptic feedback logic
      return state
    
    case 'START_DISCOVERABLE_TIMER':
      return {
        ...state,
        discoverableStartedAt: Date.now()
      }
    
    case 'STOP_DISCOVERABLE_TIMER':
      return {
        ...state,
        accumulatedDiscoverableTime: state.discoverableStartedAt 
          ? state.accumulatedDiscoverableTime + (Date.now() - state.discoverableStartedAt)
          : state.accumulatedDiscoverableTime,
        discoverableStartedAt: null
      }
    
    case 'RESET_TIMER':
      return {
        ...state,
        discoverableStartedAt: null,
        accumulatedDiscoverableTime: 0
      }
    
    default:
      return state
  }
}

// Context value interface
export interface LiveStoreContextValue {
  // State
  isLive: boolean
  isDiscoverable: boolean
  state: LiveState
  startedAt: number
  sessionId: string | null
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
  
  // Actions
  dispatch: (event: LiveEvent) => void
  goLive: () => Promise<void>
  goDiscoverable: () => Promise<void>
  goUndiscoverable: () => Promise<void>
  toggleDiscoverable: () => void
  confirmJoin: (localVideoEl: HTMLVideoElement, localAudioEl?: HTMLAudioElement) => Promise<void>
  startNext: (localVideoEl: HTMLVideoElement) => Promise<void>
  endLive: () => Promise<void>
  toggleEarningsDisplay: () => void
  incrementCall: (earnings: number) => void
  updateQueueCount: (count: number) => void
  triggerHaptic: () => void
}

const LiveStoreContext = createContext<LiveStoreContextValue | null>(null)

interface LiveStoreProviderProps {
  children: ReactNode
}

export function LiveStoreProvider({ children }: LiveStoreProviderProps) {
  console.log('[LiveStoreProvider] Rendering...')
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user } = useAuth()
  console.log('[LiveStoreProvider] User from auth:', user?.id || 'no user')

  const handleDispatch = useCallback((event: LiveEvent) => {
    console.info(`[LIVE][STATE] ${state.state} + ${event.type}`)
    dispatch({ type: 'STATE_TRANSITION', event })
  }, [state.state])

  // Setup media subscriptions on mount
  useEffect(() => {
    ensureMediaSubscriptions()
  }, [])

  // GO DISCOVERABLE: just set availability (no media)
  const goDiscoverable = useCallback(async () => {
    if (!user || state.state !== 'OFFLINE' || state.inFlight.start) return
    
    console.log('[LiveStore] Going discoverable...')
    handleDispatch({ type: 'GO_LIVE' }) // -> DISCOVERABLE
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // GO UNDISCOVERABLE: return to offline (proper FSM transition)
  const goUndiscoverable = useCallback(async () => {
    if (!user || state.state !== 'DISCOVERABLE' || state.inFlight.end) return
    
    console.log('[LiveStore] Going offline from discoverable...')
    // Follow FSM: DISCOVERABLE -> END_LIVE -> TEARDOWN -> SESSION_ENDED -> OFFLINE
    handleDispatch({ type: 'END_LIVE' }) // -> TEARDOWN
    // The reducer will handle the next transition to OFFLINE
  }, [user, state.state, state.inFlight.end, handleDispatch])

  // GO LIVE: availability only (no media)
  const goLive = useCallback(async () => {
    if (!user || !canGoLive(state.state) || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      console.info('[LIVE][GO_LIVE] Setting availability...')
      ensureMediaSubscriptions()
      handleDispatch({ type: 'GO_LIVE' }) // -> DISCOVERABLE
      console.info('[LIVE][GO_LIVE] Now discoverable for calls')
      
    } catch (error) {
      console.error('[LIVE][GO_LIVE] Failed:', error)
      handleDispatch({ type: 'START_FAILED' })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' })
    }
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // START NEXT: enter lobby and trigger preview via subscription  
  const startNext = useCallback(async (localVideoEl: HTMLVideoElement) => {
    if (!user || state.state !== 'DISCOVERABLE' || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      console.info('[LIVE][START_NEXT] Entering prep...')
      ensureMediaSubscriptions()
      
      // Store video element for orchestrator subscription
      ;(window as any).__skipLocalVideoEl = localVideoEl
      
      handleDispatch({ type: 'ENTER_PREP' })
      await Promise.resolve() // allow reducer commit → SESSION_PREP
      
      // ensureMediaSubscriptions will observe SESSION_PREP and call orchestrateInit for preview
      console.info('[LIVE][START_NEXT] Prep initiated, media will initialize via subscription')
      
    } catch (error) {
      console.error('[LIVE][START_NEXT] Failed:', error)
      handleDispatch({ type: 'START_FAILED' })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' })
    }
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // CONFIRM JOIN: both sides agreed; upgrade to full media + RTC and move to ACTIVE on ICE connected
  const confirmJoin = useCallback(async (localVideoEl: HTMLVideoElement, localAudioEl?: HTMLAudioElement) => {
    if (!user || state.state !== 'SESSION_PREP' || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      console.info('[LIVE][CONFIRM_JOIN] Entering joining state...')
      handleDispatch({ type: 'ENTER_JOINING' }) // intent
      await Promise.resolve() // commit → SESSION_JOINING

      await orchestrateInit({
        targetState: 'SESSION_JOINING',
        previewOnly: false,
        videoEl: localVideoEl,
        audioEl: localAudioEl,
      })

      // Create live session in API
      console.info('[LIVE][CONFIRM_JOIN] Creating live session...')
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
      
      dispatch({ 
        type: 'SET_SESSION_DATA', 
        sessionId: session.id,
        startedAt: Date.now() 
      })

      // Minimal RTC skeleton (replace signaling as needed)
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      mediaManager.setPeerConnection(pc)
      const stream = mediaManager.getLocalStream()
      stream?.getTracks().forEach(t => pc.addTrack(t, stream))

      pc.oniceconnectionstatechange = async () => {
        const s = pc.iceConnectionState
        if (s === 'connected' || s === 'completed') {
          await handleDispatch({ type: 'SESSION_STARTED' }) // -> SESSION_ACTIVE
        }
        if (s === 'failed' || s === 'disconnected') {
          routeMediaError(new Error('RTC failed'))
        }
      }

      // TODO: replace placeholders with your signaling
      // const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      // send offer to server; receive answer; await pc.setRemoteDescription(answer);

    } catch (e) {
      routeMediaError(e)
      // Roll back cleanly to PREP so the creator can retry or pick another caller
      await orchestrateStop('join_failed')
      await handleDispatch({ type: 'START_FAILED' })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'start' })
    }
  }, [user, state.state, state.inFlight.start, handleDispatch])

  // END/STOP: full release
  const endLive = useCallback(async () => {
    if (!user || !canEndLive(state.state) || state.inFlight.end) return

    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'end', controller })

    try {
      console.info('[LIVE][END] Ending session...')
      
      handleDispatch({ type: 'END_LIVE' })
      
      // Update session in API if exists
      if (state.sessionId) {
        await supabase
          .from('live_sessions')
          .update({
            ended_at: new Date().toISOString(),
            calls_taken: state.callsTaken,
            total_earnings_cents: state.totalEarningsCents
          })
          .eq('id', state.sessionId)
      }

      await orchestrateStop('user_end')
      handleDispatch({ type: 'SESSION_ENDED' }) // -> OFFLINE or back to DISCOVERABLE
      
      console.info('[LIVE][END] Session ended successfully')
      
    } catch (error) {
      console.error('[LIVE][END] Failed:', error)
      handleDispatch({ type: 'END_FAILED' })
    } finally {
      dispatch({ type: 'SET_IN_FLIGHT', operation: 'end' })
    }
  }, [user, state.state, state.sessionId, state.callsTaken, state.totalEarningsCents, state.inFlight.end, handleDispatch])

  const toggleEarningsDisplay = useCallback(() => {
    dispatch({ type: 'TOGGLE_EARNINGS' })
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

  const toggleDiscoverable = useCallback(() => {
    console.log('[LiveStore] Toggle discoverable clicked, current state:', state.state)
    if (state.inFlight.start || state.inFlight.end || isTransitioning(state.state)) {
      console.log('[LiveStore] Toggle blocked - transitioning or in flight')
      return
    }
    // Ignore when in active call
    if (state.state === 'SESSION_ACTIVE') {
      console.log('[LiveStore] Toggle ignored - in active call')
      return
    }
    
    if (state.state === 'OFFLINE') {
      goDiscoverable()
    } else if (state.state === 'DISCOVERABLE') {
      goUndiscoverable()
    }
  }, [state.state, state.inFlight.start, state.inFlight.end, goDiscoverable, goUndiscoverable])

  // Computed values
  const elapsedTime = useMemo(() => {
    if (state.state === 'DISCOVERABLE' && state.discoverableStartedAt) {
      const currentTime = state.accumulatedDiscoverableTime + (Date.now() - state.discoverableStartedAt)
      const minutes = Math.floor(currentTime / 60000)
      const seconds = Math.floor((currentTime % 60000) / 1000)
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else if (state.accumulatedDiscoverableTime > 0) {
      const minutes = Math.floor(state.accumulatedDiscoverableTime / 60000)
      const seconds = Math.floor((state.accumulatedDiscoverableTime % 60000) / 1000)
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return '00:00'
  }, [state.state, state.discoverableStartedAt, state.accumulatedDiscoverableTime])

  const earningsDisplay = useMemo(() => {
    return `${state.callsTaken} / $${(state.totalEarningsCents / 100).toFixed(0)}`
  }, [state.callsTaken, state.totalEarningsCents])

  const contextValue: LiveStoreContextValue = {
    // State
    isLive: state.state === 'SESSION_ACTIVE',
    isDiscoverable: ['DISCOVERABLE', 'SESSION_PREP', 'SESSION_JOINING'].includes(state.state),
    state: state.state,
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
    
    // Actions
    dispatch: handleDispatch,
    goLive,
    goDiscoverable,
    goUndiscoverable,
    toggleDiscoverable,
    confirmJoin,
    startNext,
    endLive,
    toggleEarningsDisplay,
    incrementCall,
    updateQueueCount,
    triggerHaptic
  }

  console.log('[LiveStoreProvider] Providing context value, state:', state.state)
  
  return (
    <LiveStoreContext.Provider value={contextValue}>
      {children}
    </LiveStoreContext.Provider>
  )
}

export function useLiveStore(): LiveStoreContextValue {
  console.log('[useLiveStore] Called...')
  const context = useContext(LiveStoreContext)
  console.log('[useLiveStore] Context:', context ? 'found' : 'null')
  if (!context) {
    console.error('[useLiveStore] Context is null! Provider not found in component tree.')
    throw new Error('useLiveStore must be used within a LiveStoreProvider')
  }
  return context
}