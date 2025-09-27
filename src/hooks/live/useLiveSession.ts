/**
 * Legacy hook - now delegates to centralized store
 * Kept for compatibility during transition
 */

import { useLiveStore } from '@/stores/live-store'

export type LiveState = 'OFFLINE' | 'STARTING' | 'LIVE' | 'ENDING'

export function useLiveSession() {
  const store = useLiveStore()
  
  return {
    // State (mapped from new store)
    isLive: store.isLive,
    state: store.state,
    startedAt: store.startedAt ? new Date(store.startedAt).toISOString() : undefined,
    sessionId: store.sessionId,
    callsTaken: store.callsTaken,
    totalEarningsCents: store.totalEarningsCents,
    rightDisplayMode: store.showEarnings ? 'earnings' : 'time',
    isTransitioning: store.isTransitioning,
    
    // Error states
    error: null, // Handled by store internally
    
    // Computed
    elapsedTime: store.elapsedTime,
    earningsDisplay: store.earningsDisplay,
    
    // Actions
    goLive: store.goLive,
    endLive: store.endLive,
    toggleRightDisplay: store.toggleEarningsDisplay,
    incrementCall: store.incrementCall
  }
}