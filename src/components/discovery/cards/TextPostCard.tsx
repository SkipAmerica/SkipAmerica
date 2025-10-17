import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { CreatorHistoryCarousel } from '../CreatorHistoryCarousel'
import { LiveAvatar } from '../LiveAvatar'
import { PostCardHeader } from './shared/PostCardHeader'
import { PostCardActions } from './shared/PostCardActions'
import { PostCardMedia } from './shared/PostCardMedia'
import { DeleteContentDialog } from '@/components/shared/DeleteContentDialog'
import { usePostInteractions } from './shared/usePostInteractions'
import { cn } from '@/lib/utils'
import { useAuth } from '@/app/providers/auth-provider'

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
  media_status?: string
  mux_upload_id?: string | null
  duration_sec?: number | null
  aspect_ratio?: string | null
  metadata?: any
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

interface TextPostCardProps {
  post: ThreadPost
  isLast?: boolean
}

export function TextPostCard({ post, isLast }: TextPostCardProps) {
  const { user } = useAuth()
  const isOwnPost = user?.id === post.creator.id

  const {
    isLiked,
    likeCount,
    handleLike,
    isFollowing,
    handleFollowToggle,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDelete,
    deleting,
    cardRef,
    swipeHandlers,
    showHistory,
    setShowHistory,
  } = usePostInteractions({
    postId: post.id,
    creatorId: post.creator.id,
    initialLikeCount: post.like_count,
  })

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
      {...swipeHandlers}
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
          <PostCardHeader
            creator={post.creator}
            timestamp={post.published_at || post.created_at}
            isOwnPost={isOwnPost}
            onDelete={() => setShowDeleteDialog(true)}
            variant="column"
            showAvatar={false}
          />

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

            {(post.media_url || post.playback_id || (post.content_type === 'video' && post.media_status === 'processing')) && (
              <PostCardMedia
                contentType={post.content_type as 'image' | 'video'}
                mediaUrl={post.media_url}
                thumbnailUrl={post.thumbnail_url}
                playbackId={post.playback_id}
                provider={post.provider}
                mediaStatus={post.media_status}
                metadata={post.metadata}
                title={post.title}
                fullWidth={false}
              />
            )}
          </div>

          <PostCardActions
            postId={post.id}
            creatorId={post.creator.id}
            isLive={post.creator.isLive}
            likeCount={likeCount}
            commentCount={post.comment_count}
            isLiked={isLiked}
            onLike={handleLike}
            showBorder={true}
          />
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
