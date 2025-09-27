/**
 * Centralized Live Store using React Context + useReducer
 * Manages all live session state and media orchestration
 */
import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, ReactNode } from 'react'
import { transition, canGoLive, canEndLive, LiveState, LiveEvent, isTransitioning } from '@/hooks/live/use-live-state-machine'
import { ensureMediaSubscriptions, orchestrateInit, orchestrateStop, routeMediaError, mediaManager } from '@/media/MediaOrchestrator'
import { useAuth } from '@/app/providers/auth-provider'
import { supabase } from '@/integrations/supabase/client'

/* Prevent double-taps/races on discoverable toggle */
let __discToggleInFlight = false;

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
  // Daily counters
  todayKey: string // YYYY-MM-DD local date
  todayEarningsCents: number
  todayCalls: number
  // Per-session analytics
  currentSessionId: number
  sessionCalls: number
  sessionEarningsCents: number
  sessionStartedAt: number | null // ms since epoch when session began
  sessionElapsed: number // accumulated ms for THIS session
  // Discoverability modal state
  showDiscoverabilityModal: boolean
  // Lobby broadcasting state
  isLobbyBroadcasting: boolean
  // Lobby chat state
  lobbyChatMessages: Array<{ id: string; text: string; from: "creator" }>
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
  | { type: 'TRIGGER_HAPTIC'; payload?: { heavy?: boolean } }
  | { type: 'START_DISCOVERABLE_TIMER' }
  | { type: 'STOP_DISCOVERABLE_TIMER' }
  | { type: 'RESET_TIMER' }
  | { type: 'SET_DISCOVERABILITY_MODAL'; open: boolean }
  | { type: 'SET_LOBBY_BROADCASTING'; broadcasting: boolean }
  | { type: 'ADD_LOBBY_CHAT_MESSAGE'; text: string }

// Helper to determine discoverable posture
const inDiscoverablePosture = (state: string) =>
  state === 'DISCOVERABLE' || state === 'SESSION_PREP' || state === 'SESSION_JOINING';

const getTodayKey = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format

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
  todayKey: getTodayKey(),
  todayEarningsCents: 0,
  todayCalls: 0,
  // Per-session analytics
  currentSessionId: 0,
  sessionCalls: 0,
  sessionEarningsCents: 0,
  sessionStartedAt: null,
  sessionElapsed: 0,
  // Discoverability modal state
  showDiscoverabilityModal: false,
  // Lobby broadcasting state
  isLobbyBroadcasting: false,
  // Lobby chat state
  lobbyChatMessages: [],
  inFlight: {
    start: null,
    end: null
  }
}

function reducer(state: LiveStoreState, action: Action): LiveStoreState {
  switch (action.type) {
    case 'STATE_TRANSITION': {
      const prevState = state.state;
      const nextState = transition(prevState, action.event);
      let updates: Partial<LiveStoreState> = { state: nextState };
      
      // Centralized posture check for ALL state transitions
      const wasInDiscoverablePosture = inDiscoverablePosture(prevState);
      const isNowInDiscoverablePosture = inDiscoverablePosture(nextState);
      const now = Date.now();
      
      // Handle EXIT from discoverable posture - finalize session analytics
      if (wasInDiscoverablePosture && !isNowInDiscoverablePosture) {
        // Accumulate session time and stop timer
        if (state.sessionStartedAt) {
          updates.sessionElapsed = state.sessionElapsed + (now - state.sessionStartedAt);
          updates.sessionStartedAt = null;
        }
        // Also handle legacy discoverable timer
        if (state.discoverableStartedAt) {
          updates.accumulatedDiscoverableTime = state.accumulatedDiscoverableTime + 
            (now - state.discoverableStartedAt);
          updates.discoverableStartedAt = null;
        }
        
        // Emit session ended analytics
        console.info(`[Analytics] SessionEnded`, {
          sessionId: state.currentSessionId,
          durationMs: updates.sessionElapsed || state.sessionElapsed,
          calls: state.sessionCalls,
          earningsCents: state.sessionEarningsCents
        });
      }
      
      // Handle ENTRY to discoverable posture - start new session with reset analytics
      if (!wasInDiscoverablePosture && isNowInDiscoverablePosture) {
        // New discoverable session begins: hard reset per-session analytics to zero
        updates.currentSessionId = (state.currentSessionId || 0) + 1;
        updates.sessionCalls = 0;
        updates.sessionEarningsCents = 0;
        updates.sessionElapsed = 0;
        updates.sessionStartedAt = now;
        
        // Also start legacy discoverable timer
        if (!state.discoverableStartedAt) {
          updates.discoverableStartedAt = now;
        }
        
        // Emit session started analytics
        console.info(`[Analytics] SessionStarted`, {
          sessionId: updates.currentSessionId
        });
      }
      
      return { ...state, ...updates };
    }
    
    case 'SET_SESSION_DATA':
      return {
        ...state,
        sessionId: action.sessionId,
        startedAt: action.startedAt
      }
    
    case 'INCREMENT_CALL': {
      // Check for day rollover
      const currentTodayKey = getTodayKey()
      let newState = { ...state }
      
      if (currentTodayKey !== state.todayKey) {
        // Day has rolled over - reset daily counters
        newState.todayKey = currentTodayKey
        newState.todayEarningsCents = 0
        newState.todayCalls = 0
      }
      
      return {
        ...newState,
        callsTaken: state.callsTaken + 1,
        totalEarningsCents: state.totalEarningsCents + action.earnings,
        todayEarningsCents: newState.todayEarningsCents + action.earnings,
        todayCalls: newState.todayCalls + 1,
        // Also increment per-session analytics
        sessionCalls: state.sessionCalls + 1,
        sessionEarningsCents: state.sessionEarningsCents + action.earnings
      }
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
      if (state.hapticsEnabled) {
        const triggerHapticFeedback = async (heavy?: boolean) => {
          try {
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
            const style = heavy ? ImpactStyle.Heavy : ImpactStyle.Medium
            await Haptics.impact({ style })
          } catch (error) {
            console.warn('[Haptic] Haptic feedback not supported:', error)
          }
        }
        
        triggerHapticFeedback(action.payload?.heavy)
      }
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
    
    case 'SET_DISCOVERABILITY_MODAL':
      return {
        ...state,
        showDiscoverabilityModal: action.open
      }
    
    case 'SET_LOBBY_BROADCASTING':
      return {
        ...state,
        isLobbyBroadcasting: action.broadcasting
      }
    
    case 'ADD_LOBBY_CHAT_MESSAGE':
      const newMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: action.text,
        from: "creator" as const
      }
      // Keep only last 50 messages
      const updatedMessages = [...state.lobbyChatMessages, newMessage].slice(-50)
      return {
        ...state,
        lobbyChatMessages: updatedMessages
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
  // Daily counters
  todayKey: string
  todayEarningsCents: number
  todayCalls: number
  // Per-session analytics
  currentSessionId: number
  sessionCalls: number
  sessionEarningsCents: number
  sessionStartedAt: number | null
  sessionElapsed: number
  // Timer fields
  discoverableStartedAt: number | null
  accumulatedDiscoverableTime: number
  // Modal fields
  showDiscoverabilityModal: boolean
  // Lobby broadcasting
  isLobbyBroadcasting: boolean
  // Lobby chat
  lobbyChatMessages: Array<{ id: string; text: string; from: "creator" }>
  
  // Actions
  dispatch: (event: LiveEvent) => void
  goLive: () => Promise<void>
  goDiscoverable: () => Promise<void>
  goUndiscoverable: () => Promise<void>
  toggleDiscoverable: () => void
  enterPrep: () => Promise<void>
  confirmJoin: (localVideoEl: HTMLVideoElement, localAudioEl?: HTMLAudioElement) => Promise<void>
  startNext: (localVideoEl: HTMLVideoElement) => Promise<void>
  endLive: () => Promise<void>
  toggleEarningsDisplay: () => void
  incrementCall: (earnings: number) => void
  updateQueueCount: (count: number) => void
  triggerHaptic: () => void
  setDiscoverabilityModal: (open: boolean) => void
  setLobbyBroadcasting: (broadcasting: boolean) => void
  addLobbyChatMessage: (text: string) => void
}

const LiveStoreContext = createContext<LiveStoreContextValue | null>(null)

interface LiveStoreProviderProps {
  children: ReactNode
}

export function LiveStoreProvider({ children }: LiveStoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user } = useAuth()

  const handleDispatch = useCallback((event: LiveEvent) => {
    console.info(`[LIVE][STATE] ${state.state} + ${event.type}`)
    dispatch({ type: 'STATE_TRANSITION', event })
  }, [])

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
    if (__discToggleInFlight) return;
    __discToggleInFlight = true;
    try {
      const st = state.state;

      // Complete the legal FSM path: DISCOVERABLE -> TEARDOWN -> OFFLINE
      await handleDispatch({ type: 'END_LIVE' });      // should move to TEARDOWN
      await Promise.resolve();                         // allow reducer to commit microtask
      await handleDispatch({ type: 'SESSION_ENDED' }); // TEARDOWN -> OFFLINE

      console.info('[DISCOVERABLE] -> OFFLINE (END_LIVE → SESSION_ENDED)');
    } finally {
      __discToggleInFlight = false;
    }
  }, [handleDispatch, state.state])

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

  // ENTER PREP: transition to SESSION_PREP from OFFLINE or DISCOVERABLE (for queue button)
  const enterPrep = useCallback(async () => {
    if (!user || state.inFlight.start) return
    
    const controller = new AbortController()
    dispatch({ type: 'SET_IN_FLIGHT', operation: 'start', controller })
    
    try {
      ensureMediaSubscriptions()
      
      if (state.state === 'OFFLINE') {
        console.info('[LIVE][ENTER_PREP] From OFFLINE: Going discoverable first...')
        handleDispatch({ type: 'GO_LIVE' }) // OFFLINE -> DISCOVERABLE
        await Promise.resolve() // allow reducer commit
        
        console.info('[LIVE][ENTER_PREP] Now entering prep...')
        handleDispatch({ type: 'ENTER_PREP' }) // DISCOVERABLE -> SESSION_PREP
      } else if (state.state === 'DISCOVERABLE') {
        console.info('[LIVE][ENTER_PREP] From DISCOVERABLE: Entering prep...')
        handleDispatch({ type: 'ENTER_PREP' }) // DISCOVERABLE -> SESSION_PREP
      } else if (state.state === 'SESSION_PREP') {
        console.info('[LIVE][ENTER_PREP] Already in SESSION_PREP (no-op)')
        return
      } else {
        console.info('[LIVE][ENTER_PREP] Ignored in state:', state.state)
        return
      }
      
      await Promise.resolve() // allow reducer commit → SESSION_PREP
      console.info('[LIVE][ENTER_PREP] Now in SESSION_PREP state')
      
    } catch (error) {
      console.error('[LIVE][ENTER_PREP] Failed:', error)
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

      handleDispatch({ type: 'ENTER_PREP' })
      await Promise.resolve() // allow reducer commit → SESSION_PREP

      console.info('[LIVE][START_NEXT] Prep initiated; preview will be started in PreCallLobby after user gesture')
      
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
      dispatch({ type: 'RESET_TIMER' }) // Reset timer when session fully ends
      
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

  const triggerHaptic = useCallback((heavy?: boolean) => {
    dispatch({ type: 'TRIGGER_HAPTIC', payload: { heavy } })
  }, [])

  const triggerDiscoverabilityHaptics = useCallback(async () => {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch {
      // silently ignore on web/unsupported
    }
  }, [])

  const setDiscoverabilityModal = useCallback((open: boolean) => {
    dispatch({ type: 'SET_DISCOVERABILITY_MODAL', open })
  }, [])

  const setLobbyBroadcasting = useCallback((broadcasting: boolean) => {
    dispatch({ type: 'SET_LOBBY_BROADCASTING', broadcasting })
  }, [])

  const addLobbyChatMessage = useCallback((text: string) => {
    dispatch({ type: 'ADD_LOBBY_CHAT_MESSAGE', text })
  }, [])

  const toggleDiscoverable = useCallback(async () => {
    if (__discToggleInFlight) return;

    const st = state.state;

    // Ignore toggles while transitional states are in progress to prevent races
    if (st === 'TEARDOWN') {
      console.info('[DISCOVERABLE][ignored] state:', st);
      return;
    }

    if (st === 'OFFLINE') {
      // Trigger haptics and show modal when going discoverable
      await triggerDiscoverabilityHaptics();
      setDiscoverabilityModal(true);
      // Go discoverable immediately
      goDiscoverable();
      return;
    }

    // Treat DISCOVERABLE posture (and lobby/joining) as "on"
    if (st === 'DISCOVERABLE' || st === 'SESSION_PREP' || st === 'SESSION_JOINING') {
      return goUndiscoverable();
    }

    // In an active call, center toggle is not responsible for ending; do nothing.
    console.info('[DISCOVERABLE][no-op] state:', st);
  }, [state.state, goDiscoverable, goUndiscoverable, triggerDiscoverabilityHaptics, setDiscoverabilityModal])

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
    // Daily counters
    todayKey: state.todayKey,
    todayEarningsCents: state.todayEarningsCents,
    todayCalls: state.todayCalls,
    // Per-session analytics
    currentSessionId: state.currentSessionId,
    sessionCalls: state.sessionCalls,
    sessionEarningsCents: state.sessionEarningsCents,
    sessionStartedAt: state.sessionStartedAt,
    sessionElapsed: state.sessionElapsed,
    // Timer fields
    discoverableStartedAt: state.discoverableStartedAt,
    accumulatedDiscoverableTime: state.accumulatedDiscoverableTime,
    // Modal fields
    showDiscoverabilityModal: state.showDiscoverabilityModal,
    // Lobby broadcasting
    isLobbyBroadcasting: state.isLobbyBroadcasting,
    // Lobby chat
    lobbyChatMessages: state.lobbyChatMessages,
    
    // Actions
    dispatch: handleDispatch,
    goLive,
    goDiscoverable,
    goUndiscoverable,
    toggleDiscoverable,
    enterPrep,
    confirmJoin,
    startNext,
    endLive,
    toggleEarningsDisplay,
    incrementCall,
    updateQueueCount,
    triggerHaptic,
    setDiscoverabilityModal,
    setLobbyBroadcasting,
    addLobbyChatMessage
  }
  
  return (
    <LiveStoreContext.Provider value={contextValue}>
      {children}
    </LiveStoreContext.Provider>
  )
}

export function useLiveStore(): LiveStoreContextValue {
  const context = useContext(LiveStoreContext)
  if (!context) {
    throw new Error('useLiveStore must be used within a LiveStoreProvider')
  }
  return context
}