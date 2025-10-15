import { useEffect, useRef } from 'react'
import { RemoteVideoTrack, LocalVideoTrack, RemoteAudioTrack, LocalAudioTrack } from 'livekit-client'
import { cn } from '@/lib/utils'

export type TrackRef = {
  participantId: string
  track: RemoteVideoTrack | LocalVideoTrack | RemoteAudioTrack | LocalAudioTrack
  kind: 'video' | 'audio'
  isLocal: boolean
}

interface VideoTileProps {
  trackRef?: TrackRef
  mirror?: boolean
  rounded?: boolean
  className?: string
}

export default function VideoTile({ trackRef, mirror, rounded, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Attach/detach track when trackRef changes
  useEffect(() => {
    const track = trackRef?.track
    const el = videoRef.current
    if (!track || track.kind !== 'video' || !el) return

    console.log('[VideoTile:ATTACH]', {
      trackSid: track.sid,
      kind: track.kind,
      isLocal: trackRef?.isLocal,
      enabled: (track as any).isEnabled,
      timestamp: new Date().toISOString()
    })

    // Attach track to video element
    track.attach(el)

    // Ensure srcObject is set for Safari/iOS
    if (!el.srcObject && track.mediaStreamTrack) {
      el.srcObject = new MediaStream([track.mediaStreamTrack])
    }

    // Set video element properties
    el.muted = !!trackRef?.isLocal
    el.playsInline = true
    el.autoplay = true

    // Play on loadedmetadata
    const onLoadedMetadata = () => {
      el.play()
        .then(() => {
          console.log('[VideoTile:PLAY_SUCCESS]', { 
            trackSid: track.sid,
            isLocal: trackRef?.isLocal,
            videoWidth: el.videoWidth,
            videoHeight: el.videoHeight
          })
        })
        .catch((e) => {
          console.warn('[VideoTile:PLAY_BLOCKED]', { 
            trackSid: track.sid,
            error: e.message,
            readyState: el.readyState
          })
        })
    }

    el.addEventListener('loadedmetadata', onLoadedMetadata)

    // Attempt immediate play (may succeed if metadata already loaded)
    if (el.readyState >= 1) {
      onLoadedMetadata()
    }

    // Cleanup
    return () => {
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      try {
        track.detach(el)
      } catch {}
    }
  }, [trackRef?.track?.sid, trackRef?.track?.mediaStreamTrack?.id, trackRef?.isLocal])
  
  return (
    <div className={cn('relative w-full h-full', className)}>
      <video
        ref={videoRef}
        className={cn('w-full h-full object-cover', rounded && 'rounded-lg')}
        autoPlay
        playsInline
        muted={trackRef?.isLocal ?? true}
        style={{
          transform: mirror ? 'scaleX(-1)' : undefined,
          objectPosition: 'center center',
          minWidth: '1px',
          minHeight: '1px',
        }}
      />
      {!trackRef && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800 text-white/60">
          <span className="text-sm">No video</span>
        </div>
      )}
    </div>
  )
}
