import MuxPlayer from '@mux/mux-player-react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function PostCardMedia({
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
  const aspectRatioStyle = parseAspectRatio(aspectRatio)
  
  const containerClasses = cn(
    'overflow-hidden w-full',
    fullWidth ? 'rounded-none' : 'rounded-lg max-w-full',
    className
  )

  const containerStyle = aspectRatioStyle 
    ? { aspectRatio: aspectRatioStyle, width: '100%' } 
    : { width: '100%' }

  const imageClasses = fullWidth
    ? 'block w-full object-cover'
    : 'block w-full max-w-full max-h-64 sm:max-h-72 md:max-h-96 object-cover'

  const videoClasses = fullWidth
    ? 'block w-full object-cover'
    : 'block w-full max-w-full max-h-64 sm:max-h-72 md:max-h-96 object-cover'

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
      return (
        <div className={containerClasses} style={containerStyle}>
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
          />
        </div>
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
}
