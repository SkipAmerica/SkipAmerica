// Centralized Queue Service
// Single entry point for all queue exit operations (manual leave, session end, creator actions)

import { supabase } from '@/integrations/supabase/client'
import { analytics } from '@/lib/analytics'

export type QueueExitReason =
  | 'manual_leave'
  | 'session_ended'
  | 'creator_removed'
  | 'reported'
  | 'timeout'

export class QueueService {
  /**
   * Remove a fan from a creator's queue
   * 
   * - Idempotent: safe to call multiple times
   * - Atomic: uses RPC with row locking to prevent races
   * - Event-emitting: triggers UI refresh for next-in-line
   * 
   * @throws Error if RPC call fails (caller should handle retry/toast)
   */
  static async removeFromQueue(params: {
    creatorId: string
    fanId: string
    reason: QueueExitReason
    reportDetails?: { reason: string; notes?: string }
  }): Promise<{ success: boolean; removedWasFront: boolean }> {
    const { creatorId, fanId, reason, reportDetails } = params

    // Call atomic RPC (locks, checks front, deletes)
    const { data, error } = await supabase.rpc('remove_from_queue_v1', {
      p_creator_id: creatorId,
      p_fan_id: fanId,
      p_reason: reason,
    })

    if (error) {
      console.error('[QueueService] removeFromQueue RPC failed', {
        error,
        creatorId,
        fanId,
        reason,
      })
      analytics.queueRemoveFailed({
        creatorId,
        fanId,
        reason,
        error: error.message,
      })
      throw error
    }

    const result = data as { success: boolean; removed_was_front: boolean } | null
    const removedWasFront = Boolean(result?.removed_was_front)
    const success = Boolean(result?.success)

    // Track successful removal
    analytics.queueRemoved({
      creatorId,
      fanId,
      reason,
      removedWasFront,
      reportDetails,
    })

    // Emit event for UI listeners (decoupled)
    try {
      const event = new CustomEvent('queue:front-changed', {
        detail: { creatorId, removedFanId: fanId, removedWasFront },
      })
      window.dispatchEvent(event)
    } catch (e) {
      console.warn('[QueueService] Failed to dispatch queue:front-changed event', e)
    }

    return { success, removedWasFront }
  }
}
