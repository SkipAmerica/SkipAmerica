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
  
  // Stable trackId to prevent attach churn on trackRef rewrap
  const track = trackRef?.track as LocalVideoTrack | RemoteVideoTrack | undefined
  const trackId = track?.sid ?? track?.mediaStreamTrack?.id
  
  useEffect(() => {
    const el = videoRef.current
    
    if (!track || track.kind !== 'video' || !el) return
    
    // Ensure element is mounted in DOM before attaching
    if (!el.isConnected) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[VideoTile] Element not mounted, deferring attach')
      }
      return
    }
    
    // Micro-defer to dodge layout/visibility races
    requestAnimationFrame(() => {
      track.attach(el)
      el.muted = trackRef?.isLocal ?? true
      el.playsInline = true
      el.autoplay = true
      
      // Kick playback for Safari/iOS autoplay policy
      el.play().catch(err => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[VideoTile] Autoplay blocked, waiting for user gesture:', err)
        }
      })
    })
    
    return () => {
      track.detach(el)
    }
  }, [trackId, trackRef?.isLocal])
  
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
