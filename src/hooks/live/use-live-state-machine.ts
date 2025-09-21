/**
 * Pure state machine for live session management
 * Handles strict state transitions with proper guards
 */

export type LiveState = 'OFFLINE' | 'STARTING' | 'LIVE' | 'ENDING'

export type LiveEvent = 
  | { type: 'GO_LIVE' }
  | { type: 'LIVE_STARTED' }
  | { type: 'START_FAILED' }
  | { type: 'END_LIVE' }
  | { type: 'LIVE_ENDED' }
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
        case 'GO_LIVE': return 'STARTING'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'STARTING':
      switch (event.type) {
        case 'LIVE_STARTED': return 'LIVE'
        case 'START_FAILED': return 'OFFLINE'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'LIVE':
      switch (event.type) {
        case 'END_LIVE': return 'ENDING'
        case 'RESET': return 'OFFLINE'
        default: return currentState // no-op
      }
      
    case 'ENDING':
      switch (event.type) {
        case 'LIVE_ENDED': return 'OFFLINE'
        case 'END_FAILED': return 'LIVE'
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
  return state === 'LIVE'
}

export function isTransitioning(state: LiveState): boolean {
  return state === 'STARTING' || state === 'ENDING'
}

export function isLive(state: LiveState): boolean {
  return state === 'LIVE'
}