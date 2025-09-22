/**
 * Centralized media registry for live sessions
 * Tracks all media resources for proper cleanup
 */

export interface MediaRegistry {
  pc: RTCPeerConnection | null
  stream: MediaStream | null  
  videos: Set<HTMLVideoElement>
  phase: 'idle' | 'initializing' | 'active' | 'ending'
}

// Global registry instance
let mediaRegistry: MediaRegistry = {
  pc: null,
  stream: null,
  videos: new Set(),
  phase: 'idle'
}

// Global references for debugging/emergency cleanup
declare global {
  interface Window {
    __localStream?: MediaStream | null
    __pc?: RTCPeerConnection | null
  }
}

export function getMediaRegistry(): MediaRegistry {
  return mediaRegistry
}

export function setMediaPhase(phase: MediaRegistry['phase']): void {
  mediaRegistry.phase = phase
  console.info(`[MEDIA] Phase: ${phase}`)
}

export function registerStream(stream: MediaStream): void {
  mediaRegistry.stream = stream
  window.__localStream = stream
  console.info(`[MEDIA] Stream registered:`, stream.getTracks().length, 'tracks')
}

export function registerPeerConnection(pc: RTCPeerConnection): void {
  mediaRegistry.pc = pc
  window.__pc = pc
  console.info(`[MEDIA] PeerConnection registered`)
}

export function registerVideo(video: HTMLVideoElement): void {
  mediaRegistry.videos.add(video)
  console.info(`[MEDIA] Video registered. Total:`, mediaRegistry.videos.size)
}

export function unregisterVideo(video: HTMLVideoElement): void {
  mediaRegistry.videos.delete(video)
  console.info(`[MEDIA] Video unregistered. Remaining:`, mediaRegistry.videos.size)
}

/**
 * Comprehensive media teardown
 * Ensures all devices are fully disengaged within ~1 second
 */
export async function teardownMedia(): Promise<void> {
  if (mediaRegistry.phase === 'ending') {
    console.warn('[MEDIA] Teardown already in progress, skipping')
    return
  }

  console.info('[MEDIA] Starting comprehensive teardown...')
  setMediaPhase('ending')

  try {
    // Step 1: Clear all video elements immediately
    console.info('[MEDIA] Clearing video elements...')
    for (const video of mediaRegistry.videos) {
      try {
        video.pause()
        video.srcObject = null
        video.removeAttribute('src')
        video.load()
      } catch (err) {
        console.warn('[MEDIA] Failed to clear video:', err)
      }
    }

    // Step 2: Stop all peer connection senders/transceivers
    if (mediaRegistry.pc) {
      console.info('[MEDIA] Stopping peer connection senders...')
      try {
        const senders = mediaRegistry.pc.getSenders()
        for (const sender of senders) {
          try {
            await sender.replaceTrack(null)
          } catch (err) {
            console.warn('[MEDIA] Failed to replace track:', err)
          }
        }

        const transceivers = mediaRegistry.pc.getTransceivers()
        for (const transceiver of transceivers) {
          try {
            transceiver.direction = 'inactive'
          } catch (err) {
            console.warn('[MEDIA] Failed to set transceiver inactive:', err)
          }
        }

        // Close peer connection
        mediaRegistry.pc.close()
        
        // Clear handlers to prevent callbacks
        mediaRegistry.pc.onconnectionstatechange = null
        mediaRegistry.pc.oniceconnectionstatechange = null
        mediaRegistry.pc.onsignalingstatechange = null
        mediaRegistry.pc.ontrack = null
        mediaRegistry.pc.ondatachannel = null
        
      } catch (err) {
        console.warn('[MEDIA] Failed to stop peer connection:', err)
      }
    }

    // Step 3: Stop all media tracks
    if (mediaRegistry.stream) {
      console.info('[MEDIA] Stopping media tracks...')
      const tracks = mediaRegistry.stream.getTracks()
      for (const track of tracks) {
        try {
          track.enabled = false
          track.stop()
        } catch (err) {
          console.warn('[MEDIA] Failed to stop track:', err)
        }
      }
    }

    // Step 4: Clear registry and global references
    mediaRegistry.pc = null
    mediaRegistry.stream = null
    window.__localStream = null
    window.__pc = null

    console.info('[MEDIA] Initial teardown complete, waiting 750ms for verification...')

    // Step 5: Verify cleanup after delay
    setTimeout(() => {
      verifyTeardown()
    }, 750)

  } catch (err) {
    console.error('[MEDIA] Teardown failed:', err)
  }
}

function verifyTeardown(): void {
  console.info('[MEDIA] Verifying teardown...')
  
  const summary = {
    pc: mediaRegistry.pc ? 'OPEN' : 'CLOSED',
    stream: mediaRegistry.stream ? `${mediaRegistry.stream.getTracks().length} tracks` : 'CLEARED',
    videos: mediaRegistry.videos.size,
    liveTracksCount: mediaRegistry.stream ? mediaRegistry.stream.getTracks().filter(t => t.readyState === 'live').length : 0,
    pcState: mediaRegistry.pc ? mediaRegistry.pc.connectionState : 'N/A'
  }

  console.info('[MEDIA] Teardown summary:', summary)

  // Check for leaks
  if (summary.liveTracksCount > 0) {
    console.warn('[MEDIA][LEAK] Found live tracks after teardown:', summary.liveTracksCount)
  }
  
  if (summary.pc === 'OPEN') {
    console.warn('[MEDIA][LEAK] PeerConnection still open after teardown')
  }

  if (summary.videos > 0) {
    console.warn('[MEDIA][LEAK] Video elements still registered:', summary.videos)
  }

  // Finally set phase to idle
  setMediaPhase('idle')
  console.info('[MEDIA] Teardown verification complete')
}

/**
 * Guards media initialization based on state and phase
 */
export function canInitializeMedia(sessionState: string): boolean {
  const allowed = (sessionState === 'STARTING' || sessionState === 'LIVE') && 
                  mediaRegistry.phase !== 'ending'
  
  if (!allowed) {
    console.warn(`[MEDIA] Media initialization blocked - state: ${sessionState}, phase: ${mediaRegistry.phase}`)
  }
  
  return allowed
}

/**
 * Emergency cleanup for dev environments
 */
export function emergencyCleanup(): void {
  console.warn('[MEDIA] Emergency cleanup triggered')
  
  // Stop any global streams
  if (window.__localStream) {
    window.__localStream.getTracks().forEach(track => {
      track.enabled = false
      track.stop()
    })
    window.__localStream = null
  }
  
  // Close global peer connection
  if (window.__pc) {
    window.__pc.close()
    window.__pc = null
  }
  
  // Reset registry
  mediaRegistry = {
    pc: null,
    stream: null,
    videos: new Set(),
    phase: 'idle'
  }
  
  console.warn('[MEDIA] Emergency cleanup complete')
}

// Dev-only listeners for cleanup
if (typeof window !== 'undefined') {
  const isDev = import.meta.env.DEV || (window as any).__SKIP_DEBUG__ === true

  if (isDev) {
    // Cleanup on visibility change (backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && mediaRegistry.phase === 'active') {
        console.info('[MEDIA] App backgrounded, triggering cleanup')
        teardownMedia()
      }
    })

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (mediaRegistry.phase !== 'idle') {
        emergencyCleanup()
      }
    })

    // Expose for debugging
    ;(window as any).__mediaRegistry = getMediaRegistry
    ;(window as any).__emergencyCleanup = emergencyCleanup
  }
}