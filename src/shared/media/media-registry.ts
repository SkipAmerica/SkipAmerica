/**
 * Centralized media registry for live sessions
 * Tracks all media resources for proper cleanup
 */

export interface MediaRegistry {
  pc: RTCPeerConnection | null
  stream: MediaStream | null  
  videos: Set<HTMLVideoElement>
  phase: 'idle' | 'joining' | 'active' | 'ending'
  initLock: Promise<void> | null
  endLock: Promise<void> | null
}

// Global registry instance
let mediaRegistry: MediaRegistry = {
  pc: null,
  stream: null,
  videos: new Set(),
  phase: 'idle',
  initLock: null,
  endLock: null
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
 * Comprehensive media teardown with proper locking
 * Ensures all devices are fully disengaged within ~1 second
 */
export async function teardownMedia(): Promise<void> {
  // If already ending, wait for it
  if (mediaRegistry.endLock) {
    console.info('[MEDIA] Teardown already in progress, waiting...')
    await mediaRegistry.endLock
    return
  }

  console.info('[MEDIA] Starting comprehensive teardown...')
  mediaRegistry.phase = 'ending'

  // Create end lock with guard timer
  const guardTimer = setTimeout(() => {
    if (mediaRegistry.phase === 'ending') {
      console.warn('[MEDIA][GUARD] Forcing idle from ending after timeout')
      mediaRegistry.phase = 'idle'
      mediaRegistry.endLock = null
    }
  }, 2000)

  mediaRegistry.endLock = (async () => {
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

          // Close peer connection and clear handlers
          try {
            mediaRegistry.pc.close()
          } catch (err) {
            console.warn('[MEDIA] Failed to close peer connection:', err)
          }
          
          // Clear handlers to prevent callbacks
          mediaRegistry.pc.ontrack = null
          mediaRegistry.pc.onicecandidate = null
          mediaRegistry.pc.onconnectionstatechange = null
          mediaRegistry.pc.onsignalingstatechange = null
          
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

      console.info('[MEDIA] Teardown complete')

      // Schedule verification
      setTimeout(() => {
        mediaSummary('after-end')
      }, 750)

    } catch (err) {
      console.error('[MEDIA] Teardown failed:', err)
    } finally {
      clearTimeout(guardTimer)
      mediaRegistry.phase = 'idle'
      mediaRegistry.endLock = null
    }
  })()

  await mediaRegistry.endLock
}

/**
 * Media diagnostics helper
 */
export function mediaSummary(tag: string): void {
  const tracks = mediaRegistry.stream ? mediaRegistry.stream.getTracks().map(t => ({
    kind: t.kind,
    state: t.readyState,
    enabled: t.enabled
  })) : []

  const summary = {
    tag,
    pc: mediaRegistry.pc ? mediaRegistry.pc.connectionState : 'N/A',
    stream: mediaRegistry.stream ? `${tracks.length} tracks` : 'CLEARED',
    videos: mediaRegistry.videos.size,
    phase: mediaRegistry.phase,
    tracks,
    liveTracksCount: tracks.filter(t => t.state === 'live').length
  }

  console.info(`[MEDIA][${tag.toUpperCase()}]`, summary)

  // Check for leaks
  if (summary.liveTracksCount > 0 && tag === 'after-end') {
    console.warn('[MEDIA][LEAK] Found live tracks after teardown:', summary.liveTracksCount)
  }
  
  if (mediaRegistry.pc && mediaRegistry.pc.connectionState !== 'closed' && tag === 'after-end') {
    console.warn('[MEDIA][LEAK] PeerConnection still open after teardown')
  }

  if (summary.videos > 0 && tag === 'after-end') {
    console.warn('[MEDIA][LEAK] Video elements still registered:', summary.videos)
  }
}

/**
 * Guards media initialization based on state and phase
 */
/**
 * Gate function for media initialization
 */
export function canInitMedia(storeState: string, mediaPhase: string): boolean {
  const allowed = (storeState === 'SESSION_PREP' || storeState === 'SESSION_JOINING') && 
                  mediaPhase !== 'ending'
  
  if (!allowed) {
    console.warn('[MEDIA][BLOCK]', { store: storeState, phase: mediaPhase })
  }
  
  return allowed
}

/**
 * Initialize media with proper locking
 */
export async function initializeMedia(storeState: string, previewOnly = false): Promise<MediaStream | null> {
  // Check if already initializing
  if (mediaRegistry.initLock) {
    console.info('[MEDIA] Already initializing, waiting...')
    await mediaRegistry.initLock
    return mediaRegistry.stream
  }

  // Check if ending is in progress
  if (mediaRegistry.endLock) {
    console.info('[MEDIA] End in progress, waiting...')
    await mediaRegistry.endLock
  }

  // Create init lock
  mediaRegistry.initLock = (async (): Promise<void> => {
    try {
      if (!canInitMedia(storeState, mediaRegistry.phase)) {
        throw new Error('Media initialization blocked')
      }

      console.info('[MEDIA][INIT] Starting media initialization')
      mediaRegistry.phase = 'joining'

      // Get user media
      const constraints = previewOnly 
        ? { video: true, audio: false }  // Preview only needs video
        : { video: true, audio: true }   // Full session needs both

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      mediaRegistry.stream = stream
      window.__localStream = stream

      // Only create peer connection for full session
      if (!previewOnly && storeState === 'SESSION_JOINING') {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })
        
        mediaRegistry.pc = pc
        window.__pc = pc
        
        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream)
        })
      }

      mediaRegistry.phase = 'active'
      console.info('[MEDIA][INIT] Media initialization complete')
      
      return stream
    } catch (error) {
      console.error('[MEDIA][INIT] Failed:', error)
      mediaRegistry.phase = 'idle'
      throw error
    } finally {
      mediaRegistry.initLock = null
    }
  })()

  await mediaRegistry.initLock
  return mediaRegistry.stream
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
    phase: 'idle',
    initLock: null,
    endLock: null
  }
  
  console.warn('[MEDIA] Emergency cleanup complete')
}

// Dev-only listeners for cleanup and debugging
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
    ;(window as any).__mediaState = () => ({
      store: 'unknown', // Will be set by store
      phase: mediaRegistry.phase,
      initLock: !!mediaRegistry.initLock,
      endLock: !!mediaRegistry.endLock
    })
  }
}