import { useLiveStore } from '@/stores/live-store'
import { useQueueManager } from '@/hooks/live/useQueueManager'

/**
 * Singleton mount point for useQueueManager to prevent multi-mount loops.
 * This component ensures the queue manager runs exactly once for the entire app.
 */
export function QueueManagerMount() {
  const { isLive, isDiscoverable } = useLiveStore()
  useQueueManager(isLive, isDiscoverable)
  return null
}
