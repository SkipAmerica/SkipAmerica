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
  
  useEffect(() => {
    const track = trackRef?.track
    const el = videoRef.current
    
    if (!track || track.kind !== 'video' || !el) return
    
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [trackRef?.track])
  
  if (!trackRef) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-800 text-white/60', className)}>
        <span className="text-sm">No video</span>
      </div>
    )
  }
  
  return (
    <video
      ref={videoRef}
      className={cn('w-full h-full object-cover', rounded && 'rounded-lg', className)}
      autoPlay
      playsInline
      muted={trackRef.isLocal}
      style={{
        transform: mirror ? 'scaleX(-1)' : undefined,
        objectPosition: 'center center', // Better crop for tall portrait devices
      }}
    />
  )
}
