/**
 * Media preview component for live sessions
 * Properly registers/unregisters video elements with media registry
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
    const registry = getMediaRegistry()
    if (registry.stream) {
      video.srcObject = registry.stream
    }

    return () => {
      // Unregister on cleanup
      unregisterVideo(video)
    }
  }, [])

  // Watch for stream changes in registry
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const checkForStream = () => {
      const registry = getMediaRegistry()
      if (registry.stream && video.srcObject !== registry.stream) {
        video.srcObject = registry.stream
      }
    }

    // Check periodically for stream changes
    const interval = setInterval(checkForStream, 100)
    
    return () => clearInterval(interval)
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