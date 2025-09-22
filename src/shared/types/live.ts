// Live session and queue related types
export type LiveState = 'OFFLINE' | 'GOING_LIVE' | 'LIVE' | 'ENDING_LIVE'

export interface LiveSession {
  id: string
  creator_id: string
  started_at: string
  ended_at?: string
  calls_taken: number
  total_earnings_cents: number
  session_duration_minutes?: number
  created_at: string
  updated_at: string
}

export interface QueueEntry {
  id: string
  creator_id: string
  fan_id: string
  status: 'waiting' | 'in_call' | 'completed' | 'cancelled'
  estimated_wait_minutes?: number
  discussion_topic?: string
  created_at: string
  updated_at: string
}

export interface LiveSessionState {
  state: LiveState
  startedAt?: string
  sessionId?: string
  callsTaken: number
  totalEarningsCents: number
  rightDisplayMode: 'time' | 'earnings'
}

export interface QueueManagerState {
  queueCount: number
  hapticsEnabled: boolean
  lastHapticTime?: number
  hapticsSuppressedUntil?: number
  error?: string
}

// Validation helpers
export const isValidLiveState = (state: string): state is LiveState => {
  return ['OFFLINE', 'GOING_LIVE', 'LIVE', 'ENDING_LIVE'].includes(state)
}

export const canTransitionTo = (from: LiveState, to: LiveState): boolean => {
  const transitions: Record<LiveState, LiveState[]> = {
    'OFFLINE': ['GOING_LIVE'],
    'GOING_LIVE': ['LIVE', 'OFFLINE'], // Allow fallback to offline on error
    'LIVE': ['ENDING_LIVE'],
    'ENDING_LIVE': ['OFFLINE']
  }
  
  return transitions[from].includes(to)
}