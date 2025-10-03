import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Repeat2, Share, ChevronLeft, Video, Calendar } from 'lucide-react'
import { CreatorHistoryCarousel } from './CreatorHistoryCarousel'
import { LiveAvatar } from './LiveAvatar'
import { LiveActionButton } from './LiveActionButton'
import { cn } from '@/lib/utils'
import { RUNTIME } from '@/config/runtime'

interface ThreadPost {
  id: string
  title?: string
  description?: string
  content_type: string
  media_url?: string
  thumbnail_url?: string
  view_count: number
  like_count: number
  comment_count: number
  published_at?: string
  created_at: string
  creator: {
    id: string
    full_name: string
    avatar_url?: string
    username?: string
    isLive?: boolean
    title?: string
    industry?: string
  }
  platform?: string
}

interface PostCardProps {
  post: ThreadPost
  isLast?: boolean
}

export function PostCard({ post, isLast }: PostCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef<number>(0)
  const currentX = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    currentX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    
    const deltaX = currentX.current - startX.current
    const threshold = 100 // minimum swipe distance
    
    if (deltaX > threshold) {
      // Right swipe - show creator history
      setShowHistory(true)
    } else if (deltaX < -threshold && showHistory) {
      // Left swipe - hide creator history
      setShowHistory(false)
    }
    
    isDragging.current = false
  }, [showHistory])

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }, [isLiked])

  const handleJoinLive = useCallback(() => {
    if (RUNTIME.DEBUG_LOGS) {
      console.error('Joining live session for creator:', post.creator.id);
    }
    // TODO: Implement live session joining logic
  }, [post.creator.id])

  const handleBookAppointment = useCallback(() => {
    if (RUNTIME.DEBUG_LOGS) {
      console.error('Booking appointment with creator:', post.creator.id);
    }
    // TODO: Implement appointment booking logic
  }, [post.creator.id])

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`
    return `${Math.floor(diffInHours / 168)}w`
  }

  if (showHistory) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(false)}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to feed
          </Button>
        </div>
        <CreatorHistoryCarousel creatorId={post.creator.id} />
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "border-b border-border bg-background transition-colors hover:bg-muted/50 font-instagram relative overflow-hidden",
        isLast && "border-b-0"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      {post.creator.isLive && (
        <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
      )}
      <div className="flex relative z-10">
        {/* Profile Column */}
        <div className="bg-turquoise-light/15 backdrop-blur-md p-2 md:p-3 flex-shrink-0">
          <LiveAvatar
            src={post.creator.avatar_url}
            alt={post.creator.full_name}
            fallback={post.creator.full_name?.charAt(0).toUpperCase() || '?'}
            isLive={post.creator.isLive}
          />
        </div>

        {/* Content Column */}
        <div className="flex-1 p-3 md:p-4">
          {/* Header */}
          <div className="mb-3">
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-sm truncate">
                {post.creator.full_name}
              </h3>
              {post.creator.title && (
                <>
                  <span className="text-gray-500 text-sm font-normal">|</span>
                  <span className="text-sm font-normal text-foreground truncate">
                    {post.creator.title}
                  </span>
                </>
              )}
            </div>
            {post.creator.industry && (
              <p className="text-sm font-normal text-gray-500 truncate">
                {post.creator.industry}
              </p>
            )}
            <span className="text-muted-foreground text-xs font-normal">
              {formatTime(post.published_at || post.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-3">
            {post.title && (
              <h4 className="font-normal text-sm text-foreground leading-relaxed">
                {post.title}
              </h4>
            )}
            
            {post.description && (
              <p className="text-foreground text-sm font-normal leading-relaxed">
                {post.description}
              </p>
            )}

            {/* Media */}
            {post.media_url && (
              <div className="rounded-lg overflow-hidden">
                {post.content_type.startsWith('image') ? (
                  <img
                    src={post.media_url}
                    alt={post.title || 'Post image'}
                    className="w-full h-auto max-h-64 sm:max-h-72 md:max-h-96 object-cover rounded-lg mr-3"
                  />
                ) : post.content_type.startsWith('video') ? (
                  <video
                    src={post.media_url}
                    poster={post.thumbnail_url}
                    controls
                    className="w-full h-auto max-h-64 sm:max-h-72 md:max-h-96 object-cover rounded-lg mr-3"
                  />
                ) : null}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-3 md:gap-6">
              {/* Live and Booking Actions */}
              <div className="flex items-center gap-2 md:gap-3 mr-1 md:mr-2">
                {post.creator.isLive && (
                  <LiveActionButton
                    icon={Video}
                    color="green"
                    onPress={handleJoinLive}
                  />
                )}
                <LiveActionButton
                  icon={Calendar}
                  color="blue"
                  onPress={handleBookAppointment}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={cn(
                  "gap-1 md:gap-2 px-0 hover:bg-transparent",
                  isLiked && "text-red-500"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span className="text-xs font-medium">{formatCount(likeCount)}</span>
              </Button>

              <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-0 hover:bg-transparent">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">{formatCount(post.comment_count)}</span>
              </Button>

              <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-0 hover:bg-transparent">
                <Repeat2 className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}