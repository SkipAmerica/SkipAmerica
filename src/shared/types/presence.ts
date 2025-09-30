/**
 * Creator presence types for online/offline status management
 */

export interface CreatorPresenceStatus {
  creator_id: string
  is_online: boolean
  last_heartbeat: string
  updated_at: string
}

export interface PresenceUpdatePayload {
  isOnline: boolean
}

export interface UseCreatorPresenceResult {
  isOnline: boolean
  isLoading: boolean
  error: Error | null
}

export interface UsePresenceManagerResult {
  isOnline: boolean
  isUpdating: boolean
  goOnline: () => Promise<void>
  goOffline: () => Promise<void>
  error: Error | null
}
