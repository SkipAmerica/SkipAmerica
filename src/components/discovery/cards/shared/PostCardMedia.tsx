import { memo, useMemo } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntersectionObserver } from '@/shared/hooks/use-intersection-observer'
import { markPerformance, measurePerformance } from '@/lib/performance'
import { VideoErrorBoundary } from '@/shared/ui/video-error-boundary'

interface PostCardMediaProps {
  contentType: 'image' | 'video'
  mediaUrl?: string
  thumbnailUrl?: string
  playbackId?: string | null
  provider?: 'supabase' | 'mux' | null
  mediaStatus?: string
  metadata?: any
  title?: string
  fullWidth?: boolean
  aspectRatio?: string
  className?: string
}

const parseAspectRatio = (aspectRatio: string | undefined): string | undefined => {
  if (!aspectRatio) return undefined
  
  const parts = aspectRatio.split(/[:/]/).map(Number)
  if (parts.length === 2 && !parts.some(isNaN)) {
    return `${parts[0]} / ${parts[1]}`
  }
  return undefined
}

export const PostCardMedia = memo(function PostCardMedia({
  contentType,
  mediaUrl,
  thumbnailUrl,
  playbackId,
  provider,
  mediaStatus,
  metadata,
  title,
  fullWidth = false,
  aspectRatio,
  className = '',
}: PostCardMediaProps) {
  // Performance tracking
  if (import.meta.env.DEV) {
    markPerformance(`PostCardMedia-${playbackId || 'image'}-start`)
  }

  // Lazy load videos only when in viewport
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '200px' // Preload 200px before entering viewport
  });

  // Memoize parsed aspect ratio
  const aspectRatioStyle = useMemo(() => parseAspectRatio(aspectRatio), [aspectRatio]);
  
  // Memoize container classes and styles to prevent recalculation
  const containerClasses = useMemo(() => cn(
    'overflow-hidden w-full',
    fullWidth ? 'rounded-none' : 'rounded-lg max-w-full',
    className
  ), [fullWidth, className])

  const containerStyle = useMemo(() => 
    aspectRatioStyle 
      ? { aspectRatio: aspectRatioStyle, width: '100%' } 
      : { width: '100%' },
    [aspectRatioStyle]
  )

  const imageClasses = useMemo(() => 
    fullWidth
      ? 'block w-full object-cover'
      : 'block w-full max-w-full max-h-64 sm:max-h-72 md:max-h-96 object-cover',
    [fullWidth]
  )

  const videoClasses = useMemo(() => 
    fullWidth
      ? 'block w-full object-cover'
      : 'block w-full max-w-full max-h-64 sm:max-h-72 md:max-h-96 object-cover',
    [fullWidth]
  )

  if (contentType === 'image' && mediaUrl) {
    return (
      <div className={containerClasses} style={containerStyle}>
        <img
          src={mediaUrl}
          alt={title || 'Post image'}
          className={imageClasses}
          loading="lazy"
        />
      </div>
    )
  }

  if (contentType === 'video') {
    if (mediaStatus === 'processing') {
      return (
        <div className={cn(containerClasses, 'bg-muted flex items-center justify-center min-h-[300px]')}>
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Processing video...</p>
          </div>
        </div>
      )
    }

    if (mediaStatus === 'error') {
      return (
        <div className={cn(containerClasses, 'bg-destructive/10 flex items-center justify-center min-h-[300px]')}>
          <div className="text-center space-y-3 p-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-sm text-destructive font-medium">Video processing failed</p>
            {metadata?.error && (
              <p className="text-xs text-muted-foreground">{metadata.error}</p>
            )}
          </div>
        </div>
      )
    }

    if (provider === 'mux' && playbackId) {
      // Performance mark when player loads
      if (import.meta.env.DEV && isIntersecting) {
        markPerformance(`MuxPlayer-${playbackId}-visible`)
      }

      return (
        <VideoErrorBoundary>
          <div ref={intersectionRef} className={containerClasses} style={containerStyle}>
            {isIntersecting ? (
              <MuxPlayer
                streamType="on-demand"
                playbackId={playbackId}
                muted
                playsInline
                style={{ 
                  width: '100%', 
                  height: '100%',
                  aspectRatio: aspectRatioStyle || 'auto',
                  borderRadius: fullWidth ? 0 : 8, 
                  overflow: 'hidden' 
                }}
                className={fullWidth ? '' : 'rounded-lg'}
                onLoadedData={() => {
                  if (import.meta.env.DEV) {
                    measurePerformance(
                      `MuxPlayer-${playbackId}-load`,
                      `MuxPlayer-${playbackId}-visible`,
                      `PostCardMedia-${playbackId}-start`
                    )
                  }
                }}
              />
            ) : (
              <div 
                className={cn('bg-muted flex items-center justify-center', videoClasses)}
                style={{ minHeight: '300px' }}
              >
                <div className="text-muted-foreground text-sm">Loading video...</div>
              </div>
            )}
          </div>
        </VideoErrorBoundary>
      )
    }

    if (mediaUrl) {
      return (
        <div className={containerClasses} style={containerStyle}>
          <video
            src={mediaUrl}
            poster={thumbnailUrl}
            controls
            muted
            playsInline
            className={videoClasses}
            style={{ objectFit: 'cover' }}
          />
        </div>
      )
    }
  }

  return null
})
