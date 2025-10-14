import { supabase } from '@/lib/supabase'
import { QueueService } from '@/services/queue-service'

export interface EndSessionParams {
  sessionId: string
  role: 'creator' | 'user'
}

export interface EndSessionResult {
  success: boolean
  navigationPath: string
  error?: string
}

/**
 * Centralized session end logic for Almighty sessions.
 * Handles database cleanup, queue removal, and returns navigation path.
 * 
 * @param params - Session ID and user role
 * @returns Navigation path based on role (creator → '/', fan → '/join-queue/:creatorId')
 */
export async function endAlmightySession(
  params: EndSessionParams
): Promise<EndSessionResult> {
  const { sessionId, role } = params

  try {
    console.log('[endAlmightySession] Starting session end process', { sessionId, role })

    // 1. Fetch session data to get creator_id and fan_id
    const { data: session, error: fetchError } = await supabase
      .from('almighty_sessions')
      .select('creator_id, fan_id, status')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      console.error('[endAlmightySession] Failed to fetch session:', fetchError)
      // Fallback to home for both roles if session not found
      return {
        success: false,
        navigationPath: '/',
        error: 'Session not found'
      }
    }

    const { creator_id, fan_id, status } = session

    // 2. Update almighty_sessions status to 'ended' (idempotent)
    if (status !== 'ended') {
      const { error: updateError } = await supabase
        .from('almighty_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
          // duration_seconds will be calculated by database trigger
        })
        .eq('id', sessionId)
        .eq('status', 'active') // Only update if still active (idempotent)

      if (updateError) {
        console.error('[endAlmightySession] Failed to update session:', updateError)
      } else {
        console.log('[endAlmightySession] Session status updated to ended')
      }
    } else {
      console.log('[endAlmightySession] Session already ended, skipping update')
    }

    // 3. Remove from queue using V2 service
    // The cleanup_queue_on_session_end trigger will also handle this, but we do it here for immediate effect
    try {
      await QueueService.removeFromQueue({
        creatorId: creator_id,
        fanId: fan_id,
        reason: 'session_ended'
      })
      console.log('[endAlmightySession] Queue entry removed')
    } catch (queueError) {
      console.error('[endAlmightySession] Queue removal failed (trigger will handle):', queueError)
      // Non-fatal - database trigger will clean up as safety net
    }

    // 4. Return navigation path based on role
    const navigationPath = role === 'creator' ? '/' : `/join-queue/${creator_id}`
    
    console.log('[endAlmightySession] Session end complete', { navigationPath })
    
    return {
      success: true,
      navigationPath
    }

  } catch (error) {
    console.error('[endAlmightySession] Unexpected error:', error)
    return {
      success: false,
      navigationPath: '/',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
