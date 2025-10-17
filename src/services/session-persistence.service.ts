import { supabase } from '@/integrations/supabase/client'
import { Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

/**
 * Session Persistence Service
 * 
 * Handles database session CRUD operations independently from auth state.
 * Non-blocking: Auth works even if DB operations fail.
 * Idempotent: Won't sync the same token twice.
 */
class SessionPersistenceService {
  private lastSyncedToken: string | null = null
  private syncInProgress = false

  /**
   * Sync session to database
   * Idempotent: Only syncs if token changed
   * Phase 5: Added retry logic for network resilience
   */
  async syncSession(session: Session | null) {
    // Idempotency: Don't sync same token twice
    if (this.syncInProgress || this.lastSyncedToken === session?.access_token) {
      return
    }

    if (!session) {
      await this.endSession()
      return
    }

    this.syncInProgress = true
    let retries = 3
    
    while (retries > 0) {
      try {
        const { error } = await supabase.rpc('create_user_session', {
          p_user_id: session.user.id,
          p_session_token: session.access_token,
          p_email: session.user.email || '',
          p_device_info: {
            userAgent: navigator.userAgent,
            platform: Capacitor.getPlatform(),
            timestamp: new Date().toISOString()
          }
        })

        if (!error) {
          this.lastSyncedToken = session.access_token
          console.log('[SessionPersistence] Synced successfully')
          break // Success - exit retry loop
        } else {
          console.warn(`[SessionPersistence] Sync error (attempt ${4-retries}/3):`, error)
          retries--
          if (retries > 0) {
            // Wait before retry: 500ms, 1000ms, 1500ms
            await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)))
          }
        }
      } catch (error) {
        console.error(`[SessionPersistence] Exception (attempt ${4-retries}/3):`, error)
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)))
        }
      }
    }
    
    if (retries === 0) {
      console.error('[SessionPersistence] All retries exhausted - session sync failed')
    }
    
    this.syncInProgress = false
  }

  /**
   * End current session in database
   */
  async endSession() {
    if (this.lastSyncedToken) {
      try {
        await supabase.rpc('end_user_session', {
          p_session_token: this.lastSyncedToken,
          p_reason: 'manual_signout'
        })
        console.log('[SessionPersistence] Ended session')
      } catch (error) {
        console.error('[SessionPersistence] End failed:', error)
      }
      this.lastSyncedToken = null
    }
  }

  /**
   * Reset service state (for testing/cleanup)
   */
  reset() {
    this.lastSyncedToken = null
    this.syncInProgress = false
  }
}

export const sessionPersistence = new SessionPersistenceService()
