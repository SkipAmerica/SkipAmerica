/**
 * Media preview component for live sessions
 * Never calls getUserMedia - only attaches provided streams
 */

import React, { useEffect, useRef } from 'react'
import { registerVideo, unregisterVideo, getMediaRegistry } from '@/shared/media/media-registry'

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

    // Register video element
    registerVideo(video)

    // Attach stream from registry if available
    const attachStream = () => {
      const registry = getMediaRegistry()
      if (registry.stream && video.srcObject !== registry.stream) {
        console.info('[MEDIA][PREVIEW] Attaching stream to video element')
        video.srcObject = registry.stream
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
        console.warn('[MEDIA][PREVIEW] Failed to cleanup video:', err)
      }
      
      // Unregister video element
      unregisterVideo(video)
    }
  }, [])

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