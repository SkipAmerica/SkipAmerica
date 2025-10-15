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
  slot?: 'primary' | 'pip'
  sessionId?: string
}

export default function VideoTile({ trackRef, mirror, rounded, className, slot, sessionId }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const t0Ref = useRef<number>(performance.now())
  const t = () => Math.round(performance.now() - t0Ref.current)
  
  // Attach/detach track when trackRef changes
  useEffect(() => {
    const track = trackRef?.track
    const el = videoRef.current
    if (!track || track.kind !== 'video' || !el) return

    const DBG = new URLSearchParams(location.search).get('debug') === '1' || import.meta.env.VITE_ALMIGHTY_DEBUG === '1'
    
    console.log('[VideoTile:ATTACH]', {
      trackSid: track.sid,
      kind: track.kind,
      isLocal: trackRef?.isLocal,
      enabled: (track as any).isEnabled,
      timestamp: new Date().toISOString()
    })
    
    if (DBG && slot && sessionId) {
      const remoteIdentity = trackRef?.isLocal ? 'local' : (trackRef?.participantId || 'unknown')
      console.log('[VT]', {
        sessionId,
        slot,
        action: 'attach',
        isLocal: trackRef?.isLocal,
        pubSid: track.sid,
        trackId: track.mediaStreamTrack?.id,
        t: t(),
        bc: `${remoteIdentity}|camera|${track.sid || 'unknown'}`
      })
    }

    console.log('[VT:CHECK]', { slot, trackRef, track: trackRef?.track, sid: trackRef?.track?.sid });

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
          
          // [DOM] paint evidence
          if (DBG && slot && sessionId) {
            setTimeout(() => {
              const srcObj = el.srcObject as MediaStream | null
              const remoteIdentity = trackRef?.isLocal ? 'local' : (trackRef?.participantId || 'unknown')
              console.log('[DOM]', {
                sessionId,
                slot,
                hasSrc: !!srcObj,
                vTracks: srcObj?.getVideoTracks()?.length || 0,
                w: el.videoWidth,
                h: el.videoHeight,
                readyState: el.readyState,
                visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                t: t(),
                bc: `${remoteIdentity}|camera|${track.sid || 'unknown'}`
              })
            }, 50)
          }
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
      if (DBG && slot && sessionId) {
        const remoteIdentity = trackRef?.isLocal ? 'local' : (trackRef?.participantId || 'unknown')
        console.log('[VT]', {
          sessionId,
          slot,
          action: 'detach',
          isLocal: trackRef?.isLocal,
          pubSid: track.sid,
          trackId: track.mediaStreamTrack?.id,
          t: t(),
          bc: `${remoteIdentity}|camera|${track.sid || 'unknown'}`
        })
      }
      
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      try {
        track.detach(el)
      } catch {}
    }
  }, [trackRef?.track?.sid, trackRef?.track?.mediaStreamTrack?.id, trackRef?.isLocal, slot, sessionId])
  
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
