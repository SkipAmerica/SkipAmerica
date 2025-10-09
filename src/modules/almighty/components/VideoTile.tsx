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
    const track = trackRef?.track
    const el = videoRef.current as HTMLVideoElement | null
    if (!track || track.kind !== 'video' || !el || !el.isConnected) return

    let cancelled = false
    let retryTimer: number | undefined
    const tryPlay = () => {
      if (!cancelled) el.play().catch(() => {})
    }

    const onTap = () => {
      document.removeEventListener('click', onTap)
      tryPlay()
    }

    const rafId = requestAnimationFrame(() => {
      if (cancelled) return

      track.attach(el)

      // Help Safari/iOS paint immediately
      if (!el.srcObject) {
        el.srcObject = new MediaStream([track.mediaStreamTrack])
      }

      el.muted = !!trackRef?.isLocal
      el.playsInline = true
      el.autoplay = true

      el.play().catch(() => {
        // Chrome sometimes needs a post-layout retry
        retryTimer = window.setTimeout(tryPlay, 200)
        // Safari/iOS: start on next user gesture
        document.addEventListener('click', onTap, { once: true })
      })
    })

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      document.removeEventListener('click', onTap)
      cancelAnimationFrame(rafId)
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
