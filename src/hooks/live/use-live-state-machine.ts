/**
 * Pure state machine for live session management
 * Handles strict state transitions with proper guards
 */

export type LiveState = 
  | 'OFFLINE'           // Not live, no session
  | 'LIVE_AVAILABLE'    // Can go live, ready state  
  | 'SESSION_PREP'      // Preparing session (lobby/preview)
  | 'SESSION_JOINING'   // Joining session (connecting)
  | 'SESSION_ACTIVE'    // Live session active
  | 'ENDING'            // Ending session

export type LiveEvent = 
  | { type: 'GO_LIVE' }
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
        case 'GO_LIVE': return 'LIVE_AVAILABLE'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'LIVE_AVAILABLE':
      switch (event.type) {
        case 'ENTER_PREP': return 'SESSION_PREP'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'SESSION_PREP':
      switch (event.type) {
        case 'ENTER_JOINING': return 'SESSION_JOINING'
        case 'START_FAILED': return 'OFFLINE'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'SESSION_JOINING':
      switch (event.type) {
        case 'SESSION_STARTED': return 'SESSION_ACTIVE'
        case 'START_FAILED': return 'OFFLINE'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'SESSION_ACTIVE':
      switch (event.type) {
        case 'END_LIVE': return 'ENDING'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'ENDING':
      switch (event.type) {
        case 'SESSION_ENDED': return 'OFFLINE'
        case 'END_FAILED': return 'SESSION_ACTIVE'
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
  return state === 'SESSION_PREP' || state === 'SESSION_JOINING' || state === 'ENDING'
}

export function isLive(state: LiveState): boolean {
  return state === 'SESSION_ACTIVE'
}

export function canInitMedia(state: LiveState): boolean {
  return state === 'SESSION_PREP' || state === 'SESSION_JOINING'
}