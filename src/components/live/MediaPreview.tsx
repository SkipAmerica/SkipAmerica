/**
 * Updated MediaPreview component to work with new MediaOrchestrator
 * Never calls getUserMedia - only attaches provided streams
 */

import React, { useEffect, useRef } from 'react'
import { mediaManager } from '@/media/MediaOrchestrator'
import { RUNTIME } from '@/config/runtime';

interface MediaPreviewProps {
  className?: string
  muted?: boolean
  autoPlay?: boolean
}

export function MediaPreview({ className, muted = true, autoPlay = true }: MediaPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Attach stream from media manager if available
    const attachStream = () => {
      const stream = mediaManager.getLocalStream()
      if (stream && video.srcObject !== stream) {
        if (RUNTIME.DEBUG_LOGS) {
          console.error('[MEDIA][PREVIEW] Attaching stream to video element');
        }
        video.srcObject = stream
        video.muted = muted
        video.autoplay = autoPlay
        // @ts-ignore
        video.playsInline = true
        const playPromise = video.play?.()
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {})
        }
      }
    }

    // Initial attach
    attachStream()

    // Watch for stream changes
    const interval = setInterval(attachStream, 500)

    return () => {
      clearInterval(interval)
      
      // Clean up video element
      try {
        video.pause()
        video.srcObject = null
        video.removeAttribute('src')
        video.load()
      } catch (err) {
        if (RUNTIME.DEBUG_LOGS) {
          console.error('[MEDIA][PREVIEW] Failed to cleanup video:', err);
        }
      }
    }
  }, [muted, autoPlay])

  return (
    <video
      ref={videoRef}
      className={className}
      muted={muted}
      autoPlay={autoPlay}
      playsInline
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover' 
      }}
    />
  )
}