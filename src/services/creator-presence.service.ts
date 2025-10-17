/**
 * Singleton service for managing creator presence/heartbeats
 * Can be used outside React components
 */
import { supabase } from '@/integrations/supabase/client'

class CreatorPresenceService {
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private currentStatus: boolean = false
  private tasks: Map<string, () => Promise<void>> = new Map()

  /**
   * Start sending heartbeats every 30 seconds
   */
  async startHeartbeat(isOnline: boolean): Promise<void> {
    this.currentStatus = isOnline
    
    // Send immediate heartbeat
    await this.sendHeartbeat(isOnline)
    
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    // Start periodic heartbeats + run registered tasks
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat(isOnline)
      await this.runTasks()
    }, 30000) // 30 seconds
    
    console.log('[CreatorPresenceService] Heartbeat started, isOnline:', isOnline)
  }

  /**
   * Stop heartbeats and mark as offline
   */
  async stopHeartbeat(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    await this.sendHeartbeat(false)
    this.currentStatus = false
    
    console.log('[CreatorPresenceService] Heartbeat stopped')
  }

  /**
   * Send a single status update without starting interval
   */
  async updateStatus(isOnline: boolean): Promise<void> {
    await this.sendHeartbeat(isOnline)
    this.currentStatus = isOnline
  }

  /**
   * Full cleanup - stop heartbeats and clear state
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.currentStatus = false
    console.log('[CreatorPresenceService] Cleaned up')
  }

  /**
   * Get current online status
   */
  getCurrentStatus(): boolean {
    return this.currentStatus
  }

  /**
   * Register a task to run every 30 seconds alongside heartbeat
   */
  registerTask(taskId: string, task: () => Promise<void>): void {
    this.tasks.set(taskId, task)
    console.log(`[CreatorPresenceService] Registered task: ${taskId}`)
  }

  /**
   * Unregister a task
   */
  unregisterTask(taskId: string): void {
    this.tasks.delete(taskId)
    console.log(`[CreatorPresenceService] Unregistered task: ${taskId}`)
  }

  /**
   * Run all registered tasks
   */
  private async runTasks(): Promise<void> {
    for (const [taskId, task] of this.tasks.entries()) {
      try {
        await task()
      } catch (error) {
        console.error(`[CreatorPresenceService] Task ${taskId} failed:`, error)
      }
    }
  }

  /**
   * Private method to send heartbeat to edge function
   */
  private async sendHeartbeat(isOnline: boolean): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('[CreatorPresenceService] No auth token for heartbeat')
        return
      }

      await supabase.functions.invoke('creator-heartbeat', {
        body: { isOnline },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      console.log('[CreatorPresenceService] Heartbeat sent:', isOnline)
    } catch (error) {
      console.error('[CreatorPresenceService] Heartbeat error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const creatorPresenceService = new CreatorPresenceService()
