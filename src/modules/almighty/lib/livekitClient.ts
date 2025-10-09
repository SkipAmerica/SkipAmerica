import { Room, createLocalAudioTrack, createLocalVideoTrack, LocalTrack, LocalVideoTrack, VideoPresets } from 'livekit-client'
import { MEDIA } from '../config'

export function createRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h540,
    },
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
    publishDefaults: {
      videoCodec: 'h264', // h264 for camera; vp9 for screenshare (Phase 1C)
      dtx: true, // Discontinuous transmission for audio
      videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h360], // Reduced from 3 to 2 layers for CPU savings
    },
  })
}

export async function createLocalTracksWithFallback(options: {
  audio: boolean
  video: boolean
  facingMode?: 'user' | 'environment'
  cachedDeviceIds?: { audio?: string; video?: string }
}): Promise<{ tracks: LocalTrack[]; usedConstraints: any }> {
  const tracks: LocalTrack[] = []
  let usedConstraints: any = {}
  
  if (options.audio) {
    try {
      const audioTrack = await createLocalAudioTrack({
        ...MEDIA.AUDIO_CONSTRAINTS,
        deviceId: options.cachedDeviceIds?.audio,
      })
      tracks.push(audioTrack)
      usedConstraints.audio = true
    } catch (err) {
      console.warn('[LiveKit] Audio track creation failed:', err)
    }
  }
  
  if (options.video) {
    for (let i = 0; i < MEDIA.VIDEO_CONSTRAINTS_LADDER.length; i++) {
      const constraints = {
        ...MEDIA.VIDEO_CONSTRAINTS_LADDER[i],
        facingMode: options.facingMode || 'user',
        deviceId: options.cachedDeviceIds?.video,
      }
      
      try {
        const videoTrack = await createLocalVideoTrack(constraints)
        tracks.push(videoTrack)
        usedConstraints.video = { level: i, constraints }
        break
      } catch (err) {
        if (i === MEDIA.VIDEO_CONSTRAINTS_LADDER.length - 1) {
          console.error('[LiveKit] All video quality levels failed:', err)
          throw err
        }
        console.warn(`[LiveKit] Quality level ${i} failed, trying next:`, err)
      }
    }
  }
  
  return { tracks, usedConstraints }
}

export async function publishTracks(room: Room, tracks: LocalTrack[]): Promise<void> {
  for (const track of tracks) {
    await room.localParticipant.publishTrack(track, {
      simulcast: MEDIA.SIMULCAST,
      videoCodec: 'h264',
    })
  }
}

export function stopLocalTracks(room: Room): void {
  room.localParticipant.trackPublications.forEach(pub => {
    pub.track?.stop()
  })
}

// Flip camera with race guard (disable → replace → enable)
export async function switchCamera(
  room: Room,
  currentTrack: LocalVideoTrack,
  targetFacingMode: 'user' | 'environment'
): Promise<LocalVideoTrack> {
  // Disable camera first to prevent ghost preview
  if (room.localParticipant.isCameraEnabled) {
    await room.localParticipant.setCameraEnabled(false)
  }
  
  const newTrack = await createLocalVideoTrack({
    ...MEDIA.VIDEO_CONSTRAINTS_LADDER[0], // Always try highest quality first
    facingMode: targetFacingMode,
  })
  
  await room.localParticipant.unpublishTrack(currentTrack)
  await room.localParticipant.publishTrack(newTrack, { simulcast: MEDIA.SIMULCAST })
  currentTrack.stop()
  
  // Re-enable camera
  await room.localParticipant.setCameraEnabled(true)
  
  return newTrack
}

export function classifyMediaError(error: any): 'denied' | 'not_found' | 'in_use' | 'unknown' {
  const name = error?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'not_found'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'in_use'
  return 'unknown'
}

// SSR/type guard for facingMode support
export function canFlipCamera(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.mediaDevices?.getSupportedConstraints) return false
  return navigator.mediaDevices.getSupportedConstraints().facingMode === true
}
