import { useLiveSession } from './useLiveSession'
import { useQueueManager } from './useQueueManager'

/**
 * Composed hook that provides all live functionality
 * This replaces the old useLiveStatus hook with a cleaner, focused approach
 */
export function useLive() {
  const session = useLiveSession()
  const queue = useQueueManager(session.isLive)

  return {
    // Session state
    isLive: session.isLive,
    state: session.state,
    startedAt: session.startedAt,
    callsTaken: session.callsTaken,
    totalEarningsCents: session.totalEarningsCents,
    rightDisplayMode: session.rightDisplayMode,
    elapsedTime: session.elapsedTime,
    earningsDisplay: session.earningsDisplay,
    isTransitioning: session.isTransitioning,
    
    // Error states
    sessionError: session.error,
    queueError: queue.error,
    hasErrors: !!(session.error || queue.error),
    
    // Queue state
    queueCount: queue.queueCount,
    isQueueConnected: queue.isConnected,
    
    // Session actions
    goLive: session.goLive,
    endLive: session.endLive,
    toggleRightDisplay: session.toggleRightDisplay,
    incrementCall: session.incrementCall,
    
    // Queue actions
    updateQueueCount: queue.updateQueueCount,
    incrementQueue: queue.incrementQueue
  }
}

// Re-export the focused hooks for direct use if needed
export { useLiveSession } from './useLiveSession'
export { useQueueManager } from './useQueueManager'
export type { LiveState } from './useLiveSession'