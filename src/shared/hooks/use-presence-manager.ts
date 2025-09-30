/**
 * Higher-level hook for creators to manage their own presence
 * Wraps the CreatorPresenceService for React components
 */
import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { creatorPresenceService } from '@/services/creator-presence.service'
import { useCreatorPresence } from './use-creator-presence'
import type { UsePresenceManagerResult } from '@/shared/types/presence'

export function usePresenceManager(): UsePresenceManagerResult {
  const { user } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get current presence status for this creator
  const { isOnline } = useCreatorPresence(user?.id || null)

  // Go online - start heartbeats
  const goOnline = useCallback(async () => {
    if (!user) {
      setError(new Error('Not authenticated'))
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      await creatorPresenceService.startHeartbeat(true)
      console.log('[usePresenceManager] Went online')
    } catch (err) {
      console.error('[usePresenceManager] Error going online:', err)
      setError(err as Error)
    } finally {
      setIsUpdating(false)
    }
  }, [user])

  // Go offline - stop heartbeats
  const goOffline = useCallback(async () => {
    if (!user) {
      setError(new Error('Not authenticated'))
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      await creatorPresenceService.stopHeartbeat()
      console.log('[usePresenceManager] Went offline')
    } catch (err) {
      console.error('[usePresenceManager] Error going offline:', err)
      setError(err as Error)
    } finally {
      setIsUpdating(false)
    }
  }, [user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      creatorPresenceService.cleanup()
    }
  }, [])

  return {
    isOnline,
    isUpdating,
    goOnline,
    goOffline,
    error
  }
}
