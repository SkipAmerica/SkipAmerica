import { useEffect, useRef } from 'react'
import { useAuth } from './auth-provider'
import { sessionPersistence } from '@/services/session-persistence.service'

/**
 * Session Sync Mount
 * 
 * Subscribes to auth state changes and syncs session to database.
 * Debounced to prevent rapid-fire calls during token refresh.
 */
export function SessionSyncMount() {
  const { session } = useAuth()
  const syncTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Debounce: Wait 500ms before syncing
    syncTimeoutRef.current = setTimeout(() => {
      sessionPersistence.syncSession(session)
    }, 500)

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [session])

  return null
}
