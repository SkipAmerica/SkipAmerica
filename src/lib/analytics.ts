// Centralized analytics for queue operations
// Single source of truth for queue event tracking

export const analytics = {
  /**
   * Track successful queue removal
   */
  queueRemoved: (params: {
    creatorId: string
    fanId: string
    reason: string
    removedWasFront: boolean
    reportDetails?: { reason: string; notes?: string }
  }) => {
    if (import.meta.env.DEV) {
      console.log('[Analytics] queue_removed', params)
    }

    try {
      // External analytics SDK if present
      ;(window as any)?.analytics?.track?.('queue_removed', params)
    } catch (e) {
      console.warn('[Analytics] Failed to track queue_removed', e)
    }

    // Performance mark for debugging
    try {
      performance.mark?.(`queue_removed:${params.reason}`)
    } catch {}
  },

  /**
   * Track failed queue removal attempts
   */
  queueRemoveFailed: (params: {
    creatorId: string
    fanId: string
    reason: string
    error: string
  }) => {
    if (import.meta.env.DEV) {
      console.warn('[Analytics] queue_remove_failed', params)
    }

    try {
      ;(window as any)?.analytics?.track?.('queue_remove_failed', params)
    } catch (e) {
      console.warn('[Analytics] Failed to track queue_remove_failed', e)
    }
  },
}
