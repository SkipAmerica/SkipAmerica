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
  shouldShowRating?: boolean
  sessionMetadata?: {
    sessionId: string
    targetUserId: string
    targetUserName: string
    targetUserBio: string
    targetUserAvatarUrl: string
    raterRole: 'creator' | 'user'
    showTipSection: boolean
    showAppointmentLink: boolean
    creatorHasAppointments: boolean
  }
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
  
  const startTime = performance.now()
  console.log('[endAlmightySession:START]', { 
    sessionId, 
    role, 
    timestamp: startTime 
  })

  try {

    // 1. Fetch session data to get creator_id and fan_id
    console.log('[endAlmightySession:FETCH] Fetching session data', { 
      sessionId, 
      elapsed: performance.now() - startTime 
    })
    
    const { data: session, error: fetchError } = await supabase
      .from('almighty_sessions')
      .select('creator_id, fan_id, status')
      .eq('id', sessionId)
      .single()

    console.log('[endAlmightySession:FETCH] Session fetch complete', { 
      success: !fetchError, 
      status: session?.status,
      elapsed: performance.now() - startTime 
    })

    if (fetchError || !session) {
      console.error('[endAlmightySession:FETCH] Failed to fetch session:', fetchError)
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
      console.log('[endAlmightySession:UPDATE] Updating session status to ended', { 
        elapsed: performance.now() - startTime 
      })
      
      const { error: updateError } = await supabase
        .from('almighty_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
          // duration_seconds will be calculated by database trigger
        })
        .eq('id', sessionId)
        .eq('status', 'active') // Only update if still active (idempotent)

      console.log('[endAlmightySession:UPDATE] Update complete', { 
        success: !updateError, 
        elapsed: performance.now() - startTime 
      })

      if (updateError) {
        console.error('[endAlmightySession:UPDATE] Failed to update session:', updateError)
      } else {
        console.log('[endAlmightySession:UPDATE] Session status updated to ended')
      }
    } else {
      console.log('[endAlmightySession:UPDATE] Session already ended, skipping update')
    }

    // 3.5. Decline any pending session invites (prevent stale navigation)
    console.log('[endAlmightySession:INVITES] Declining pending invites', { 
      elapsed: performance.now() - startTime 
    })

    const { error: inviteError } = await supabase
      .from('session_invites')
      .update({ 
        status: 'declined'
      })
      .eq('session_id', sessionId)
      .eq('status', 'pending')

    if (inviteError) {
      console.error('[endAlmightySession:INVITES] Failed to decline invites:', inviteError)
    } else {
      console.log('[endAlmightySession:INVITES] Pending invites declined')
    }

    // 3. Remove from queue using V2 service
    // The cleanup_queue_on_session_end trigger will also handle this, but we do it here for immediate effect
    console.log('[endAlmightySession:QUEUE] Removing from queue', { 
      creatorId: creator_id, 
      fanId: fan_id,
      elapsed: performance.now() - startTime 
    })
    
    try {
      await QueueService.removeFromQueue({
        creatorId: creator_id,
        fanId: fan_id,
        reason: 'session_ended'
      })
      console.log('[endAlmightySession:QUEUE] Queue entry removed', { 
        elapsed: performance.now() - startTime 
      })
    } catch (queueError) {
      console.error('[endAlmightySession:QUEUE] Queue removal failed (trigger will handle):', queueError)
      // Non-fatal - database trigger will clean up as safety net
    }

    // 4. Fetch target user profile for rating modal
    console.log('[endAlmightySession:PROFILE] Fetching target profile', { 
      role, 
      elapsed: performance.now() - startTime 
    })
    
    let sessionMetadata: EndSessionResult['sessionMetadata']
    try {
      if (role === 'creator') {
        // Creator is rating the fan
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', fan_id)
          .single()

        sessionMetadata = {
          sessionId,
          targetUserId: fan_id,
          targetUserName: userData?.full_name || 'User',
          targetUserBio: '',
          targetUserAvatarUrl: userData?.avatar_url || '',
          raterRole: 'creator',
          showTipSection: false,
          showAppointmentLink: false,
          creatorHasAppointments: false
        }
      } else {
        // User is rating the creator
        const { data: creatorData } = await supabase
          .from('creators')
          .select('full_name, bio, avatar_url')
          .eq('id', creator_id)
          .single()

        // Check if creator has appointments
        const { count } = await supabase
          .from('creator_availability')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creator_id)
          .eq('is_active', true)

        sessionMetadata = {
          sessionId,
          targetUserId: creator_id,
          targetUserName: creatorData?.full_name || 'Creator',
          targetUserBio: creatorData?.bio || '',
          targetUserAvatarUrl: creatorData?.avatar_url || '',
          raterRole: 'user',
          showTipSection: true,
          showAppointmentLink: true,
          creatorHasAppointments: (count ?? 0) > 0
        }
      }
    } catch (err) {
      console.warn('[endAlmightySession:PROFILE] Failed to fetch target profile:', err)
    }

    console.log('[endAlmightySession:PROFILE] Profile fetch complete', { 
      hasMetadata: !!sessionMetadata, 
      elapsed: performance.now() - startTime 
    })

    // 5. Return navigation path based on role with query params for rating modal
    const navigationPath = role === 'creator' ? '/' : `/join-queue/${creator_id}`
    
    if (sessionMetadata) {
      const params = new URLSearchParams({
        sr: '1',
        sid: sessionMetadata.sessionId,
        tuid: sessionMetadata.targetUserId,
        tuname: encodeURIComponent(sessionMetadata.targetUserName),
        tubio: encodeURIComponent(sessionMetadata.targetUserBio),
        tuavatar: encodeURIComponent(sessionMetadata.targetUserAvatarUrl),
        raterRole: sessionMetadata.raterRole,
        showTip: sessionMetadata.showTipSection ? '1' : '0',
        showAppt: sessionMetadata.showAppointmentLink ? '1' : '0',
        hasAppt: sessionMetadata.creatorHasAppointments ? '1' : '0'
      })
      
      const finalPath = `${navigationPath}?${params.toString()}`
      console.log('[endAlmightySession:COMPLETE] Session end complete with rating modal', {
        navigationPath: finalPath,
        totalElapsed: performance.now() - startTime
      })
      
      return {
        success: true,
        navigationPath: finalPath,
        shouldShowRating: true,
        sessionMetadata
      }
    }
    
    console.log('[endAlmightySession:COMPLETE] Session end complete (no rating)', { 
      navigationPath,
      totalElapsed: performance.now() - startTime 
    })
    
    return {
      success: true,
      navigationPath,
      shouldShowRating: false
    }

  } catch (error) {
    console.error('[endAlmightySession:ERROR] Unexpected error:', error, {
      totalElapsed: performance.now() - startTime
    })
    return {
      success: false,
      navigationPath: '/',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
