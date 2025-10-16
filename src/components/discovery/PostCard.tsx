import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Repeat2, Share, ChevronLeft, Video, Calendar, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreatorHistoryCarousel } from './CreatorHistoryCarousel'
import { LiveAvatar } from './LiveAvatar'
import { LiveActionButton } from './LiveActionButton'
import { DeleteContentDialog } from '@/components/shared/DeleteContentDialog'
import { useContentDeletion } from '@/hooks/use-content-deletion'
import { cn } from '@/lib/utils'
import { RUNTIME } from '@/config/runtime'
import { useAuth } from '@/app/providers/auth-provider'
import { toggleLike } from '@/lib/post-utils'
import { toast } from 'sonner'

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
  provider?: 'supabase' | 'mux' | null
  playback_id?: string | null
}

interface PostCardProps {
  post: ThreadPost
  isLast?: boolean
}

export function PostCard({ post, isLast }: PostCardProps) {
  const { user } = useAuth()
  const [showHistory, setShowHistory] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef<number>(0)
  const currentX = useRef<number>(0)
  const isDragging = useRef<boolean>(false)
  
  const isOwnPost = user?.id === post.creator.id
  
  const { deleteContent, loading: deleting } = useContentDeletion({
    onSuccess: (contentId) => {
      // Emit event for any listeners
      window.dispatchEvent(
        new CustomEvent('content-deleted', { detail: { contentId } })
      )
    }
  })

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

  const handleLike = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to like posts')
      return
    }
    
    // Optimistic update
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1)
    
    try {
      const result = await toggleLike(post.id, user.id)
      setIsLiked(result.liked)
      setLikeCount(result.count)
    } catch (error) {
      // Rollback on error
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
      toast.error('Failed to update like')
      console.error('Like error:', error)
    }
  }, [isLiked, likeCount, post.id, user])

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

  const handleFollowToggle = useCallback(() => {
    setIsFollowing(prev => !prev)
    if (RUNTIME.DEBUG_LOGS) {
      console.log('Follow toggled for creator:', post.creator.id, !isFollowing);
    }
    // TODO: Implement follow/unfollow logic
  }, [post.creator.id, isFollowing])
  
  const handleDelete = useCallback(async (reason?: string) => {
    await deleteContent(post.id, { reason })
    setShowDeleteDialog(false)
  }, [deleteContent, post.id])

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
        "bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-inter relative overflow-hidden"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      <div className="flex relative z-10">
        {/* Profile Column */}
        <div className="py-3 px-3 md:py-4 md:px-4 flex-shrink-0 flex flex-col items-center">
          <LiveAvatar
            src={post.creator.avatar_url}
            alt={post.creator.full_name}
            fallback={post.creator.full_name?.charAt(0).toUpperCase() || '?'}
            isLive={post.creator.isLive}
            isFollowing={isFollowing}
            onFollowToggle={handleFollowToggle}
          />
          <span className="text-muted-foreground text-xs font-normal mt-1">
            {formatTime(post.published_at || post.created_at)}
          </span>
        </div>

        {/* Content Column */}
        <div className="min-w-0 flex-1 py-3 pr-3 md:py-4 md:pr-4">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-[0.96rem] truncate">
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
            </div>
            
            {isOwnPost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            {(post.media_url || post.playback_id) && (
              <div className="rounded-lg overflow-hidden w-full max-w-full">
                {post.content_type === 'image' && post.media_url && (
                  <img
                    src={post.media_url}
                    alt={post.title || 'Post image'}
                    className="block w-full max-w-full max-h-64 sm:max-h-72 md:max-h-96 object-cover"
                    loading="lazy"
                  />
                )}
                {post.content_type === 'video' && (
                  <>
                    {post.provider === 'mux' && post.playback_id ? (
                      <mux-player
                        stream-type="on-demand"
                        playback-id={post.playback_id}
                        muted
                        playsInline
                        style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }}
                      />
                    ) : post.media_url ? (
                      <video
                        src={post.media_url}
                        poster={post.thumbnail_url}
                        controls
                        muted
                        playsInline
                        className="block w-full max-w-full max-h-64 sm:max-h-72 md:max-h-96 object-cover"
                      />
                    ) : null}
                  </>
                )}
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
      
      <DeleteContentDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}