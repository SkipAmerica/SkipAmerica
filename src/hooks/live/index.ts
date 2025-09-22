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
    
    // Error states (simplified)
    hasErrors: false, // Errors handled internally by store
    
    // Actions
    goLive: store.goLive,
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