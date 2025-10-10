/**
 * Pure state machine for live session management
 * Handles strict state transitions with proper guards
 */

export type LiveState = 
  | 'OFFLINE'                      // Not discoverable
  | 'DISCOVERABLE'                 // Visible in discovery, queue can form
  | 'QUEUE_FRONT_AWAITING_CONSENT' // Fan at position #1, consent modal shown
  | 'QUEUE_FRONT_READY'            // Fan consented, camera ready
  | 'SESSION_PREP'                 // Lobby: creator preview + caller view
  | 'SESSION_JOINING'              // Upgrade to two-way A/V + RTC setup
  | 'SESSION_ACTIVE'               // Full 1-on-1 call on Call page
  | 'TEARDOWN'                     // Cleanup

export type LiveEvent = 
  | { type: 'GO_LIVE' }
  | { type: 'REACHED_QUEUE_FRONT' }    // Fan moved to position #1
  | { type: 'FAN_CONSENTED' }          // Fan clicked "I Agree"
  | { type: 'FAN_DECLINED_CONSENT' }   // Fan left queue
  | { type: 'ENTER_PREP' }
  | { type: 'ENTER_JOINING' }
  | { type: 'SESSION_STARTED' }
  | { type: 'START_FAILED' }
  | { type: 'END_LIVE' }
  | { type: 'SESSION_ENDED' }
  | { type: 'END_FAILED' }
  | { type: 'RESET' }

/**
 * Pure state transition function with strict guards
 * Invalid transitions return the current state (no-op)
 */
export function transition(currentState: LiveState, event: LiveEvent): LiveState {
  switch (currentState) {
    case 'OFFLINE':
      switch (event.type) {
        case 'GO_LIVE': return 'DISCOVERABLE'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'DISCOVERABLE':
      switch (event.type) {
        case 'REACHED_QUEUE_FRONT': return 'QUEUE_FRONT_AWAITING_CONSENT'
        case 'ENTER_PREP': return 'SESSION_PREP'
        case 'END_LIVE': return 'TEARDOWN'
        case 'RESET': return 'OFFLINE'
        default: return currentState
      }
      
    case 'QUEUE_FRONT_AWAITING_CONSENT':
      switch (event.type) {
        case 'FAN_CONSENTED': return 'QUEUE_FRONT_READY'
        case 'FAN_DECLINED_CONSENT': return 'DISCOVERABLE'
        case 'END_LIVE': return 'TEARDOWN'
        case 'RESET': return 'OFFLINE'
        default: return currentState
      }
      
    case 'QUEUE_FRONT_READY':
      switch (event.type) {
        case 'ENTER_PREP': return 'SESSION_PREP'
        case 'END_LIVE': return 'TEARDOWN'
        case 'RESET': return 'OFFLINE'
        default: return currentState
      }
      
    case 'SESSION_PREP':
      switch (event.type) {
        case 'ENTER_JOINING': return 'SESSION_JOINING'
        case 'START_FAILED': return 'DISCOVERABLE' // Back to queue
        case 'END_LIVE': return 'TEARDOWN' // Go offline
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'SESSION_JOINING':
      switch (event.type) {
        case 'SESSION_STARTED': return 'SESSION_ACTIVE'
        case 'START_FAILED': return 'DISCOVERABLE' // Back to queue
        case 'END_LIVE': return 'TEARDOWN'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'SESSION_ACTIVE':
      switch (event.type) {
        case 'END_LIVE': return 'TEARDOWN'
        case 'SESSION_ENDED': return 'DISCOVERABLE' // Stay discoverable for next caller
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'TEARDOWN':
      switch (event.type) {
        case 'SESSION_ENDED': return 'OFFLINE'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    default:
      return 'OFFLINE' // fallback to safe state
  }
}

/**
 * Validation helpers
 */
export function canGoLive(state: LiveState): boolean {
  return state === 'OFFLINE'
}

export function canEndLive(state: LiveState): boolean {
  return state === 'SESSION_ACTIVE'
}

export function isTransitioning(state: LiveState): boolean {
  return state === 'SESSION_PREP' || state === 'SESSION_JOINING' || state === 'TEARDOWN'
}

export function isLive(state: LiveState): boolean {
  return state === 'SESSION_ACTIVE'
}

export function canInitMedia(state: LiveState): boolean {
  return state === 'QUEUE_FRONT_AWAITING_CONSENT' || 
         state === 'QUEUE_FRONT_READY' ||
         state === 'SESSION_PREP' || 
         state === 'SESSION_JOINING'
}

export function canShowConsentModal(state: LiveState): boolean {
  return state === 'QUEUE_FRONT_AWAITING_CONSENT'
}

export function canStartSession(state: LiveState): boolean {
  return state === 'QUEUE_FRONT_READY'
}