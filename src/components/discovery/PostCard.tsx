import { useState, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Repeat2, Share, ChevronLeft } from 'lucide-react'
import { CreatorHistoryCarousel } from './CreatorHistoryCarousel'
import { cn } from '@/lib/utils'

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
        "border-b border-border bg-background transition-colors hover:bg-muted/50 font-instagram",
        isLast && "border-b-0"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      <div className="flex">
        {/* Profile Column */}
        <div className="bg-turquoise-light/15 backdrop-blur-md p-3 flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.creator.avatar_url} alt={post.creator.full_name} />
            <AvatarFallback>
              {post.creator.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content Column */}
        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm truncate">
              {post.creator.full_name}
            </h3>
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
                    className="w-full h-auto max-h-96 object-cover"
                  />
                ) : post.content_type.startsWith('video') ? (
                  <video
                    src={post.media_url}
                    poster={post.thumbnail_url}
                    controls
                    className="w-full h-auto max-h-96"
                  />
                ) : null}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={cn(
                  "gap-2 px-0 hover:bg-transparent",
                  isLiked && "text-red-500"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span className="text-xs font-medium">{formatCount(likeCount)}</span>
              </Button>

              <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">{formatCount(post.comment_count)}</span>
              </Button>

              <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
                <Repeat2 className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent">
                <Share className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground font-normal">
              {formatCount(post.view_count)} views
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}