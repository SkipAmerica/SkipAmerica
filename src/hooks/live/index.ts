import { useLiveStore } from '@/stores/live-store'
import { useLiveSession } from './useLiveSession'
import { useQueueManager } from './useQueueManager'

/**
 * Composed hook that provides all live functionality
 * Now uses centralized store as single source of truth
 */
export function useLive() {
  const store = useLiveStore()
  
  return {
    // Core state from store
    isLive: store.isLive,
    isDiscoverable: store.isDiscoverable,
    state: store.state,
    startedAt: store.startedAt,
    callsTaken: store.callsTaken,
    totalEarningsCents: store.totalEarningsCents,
    rightDisplayMode: store.showEarnings ? 'earnings' : 'time',
    elapsedTime: store.elapsedTime,
    earningsDisplay: store.earningsDisplay,
    isTransitioning: store.isTransitioning,
    
    // Button states
    canGoLive: store.canGoLive,
    canEndLive: store.canEndLive,
    
    // Queue state
    queueCount: store.queueCount,
    
    // Daily counters
    todayKey: store.todayKey,
    todayEarningsCents: store.todayEarningsCents,
    todayCalls: store.todayCalls,
    
    // Per-session analytics
    currentSessionId: store.currentSessionId,
    sessionCalls: store.sessionCalls,
    sessionEarningsCents: store.sessionEarningsCents,
    sessionStartedAt: store.sessionStartedAt,
    sessionElapsed: store.sessionElapsed,
    
    // Timer fields
    discoverableStartedAt: store.discoverableStartedAt,
    accumulatedDiscoverableTime: store.accumulatedDiscoverableTime,
    
    // Modal fields
    showDiscoverabilityModal: store.showDiscoverabilityModal,
    
    // Lobby broadcasting
    isLobbyBroadcasting: store.isLobbyBroadcasting,
    setLobbyBroadcasting: store.setLobbyBroadcasting,
    
    // Store reference for LiveControlBar
    store,
    
    // Error states (simplified)
    hasErrors: false, // Errors handled internally by store
    
    // Actions
    goLive: store.goLive,
    toggleDiscoverable: store.toggleDiscoverable,
    setDiscoverabilityModal: store.setDiscoverabilityModal,
    endLive: store.endLive,
    confirmJoin: store.confirmJoin,
    toggleRightDisplay: store.toggleEarningsDisplay,
    incrementCall: store.incrementCall,
    updateQueueCount: store.updateQueueCount,
    incrementQueue: () => store.updateQueueCount(store.queueCount + 1)
  }
}

// Re-export for compatibility
export { useLiveSession } from './useLiveSession'
export { useQueueManager } from './useQueueManager'
export { useLiveStore } from '@/stores/live-store'
export type { LiveState } from './use-live-state-machine'