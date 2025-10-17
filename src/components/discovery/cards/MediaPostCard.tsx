import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { CreatorHistoryCarousel } from '../CreatorHistoryCarousel'
import { PostCardHeader } from './shared/PostCardHeader'
import { PostCardActions } from './shared/PostCardActions'
import { PostCardMedia } from './shared/PostCardMedia'
import { ExpandableCaption } from './shared/ExpandableCaption'
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

interface MediaPostCardProps {
  post: ThreadPost
  isLast?: boolean
}

export function MediaPostCard({ post, isLast }: MediaPostCardProps) {
  const { user } = useAuth()
  const isOwnPost = user?.id === post.creator.id

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return `${Math.floor(diffInHours / 168)}w ago`
  }

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

  const caption = post.title || post.description || ''

  return (
    <div
      ref={cardRef}
      className={cn(
        "bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-inter relative overflow-hidden"
      )}
      {...swipeHandlers}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Row 1: Header */}
      <PostCardHeader
        creator={post.creator}
        timestamp={post.published_at || post.created_at}
        isOwnPost={isOwnPost}
        onDelete={() => setShowDeleteDialog(true)}
        variant="row"
        showAvatar={true}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
      />

      {/* Follow/Unfollow Button - Overlays Media */}
      {!isOwnPost && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFollowToggle()
          }}
          className={cn(
            "absolute top-3 right-3 z-10 px-4 py-1.5 rounded-lg text-sm font-medium border-2 border-white transition-all duration-200",
            isFollowing 
              ? "bg-gray-400/30 text-black hover:bg-gray-500/40" 
              : "bg-transparent text-white hover:bg-white/10"
          )}
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}

      {/* Row 2: Media - Full Width */}
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
          fullWidth={true}
        />
      )}

      {/* Row 3: Username + Caption + Timestamp */}
      {(post.creator.username || caption) && (
        <div className="px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">
            {post.creator.username && (
              <span className="font-semibold">@{post.creator.username} </span>
            )}
            {caption && <ExpandableCaption text={caption} maxLength={75} inline={true} />}
            <span className="text-xs italic text-gray-400 ml-1">
              {formatTime(post.published_at || post.created_at)}
            </span>
          </p>
        </div>
      )}

      {/* Row 4: Actions - No Border */}
      <div className="px-4 pb-3">
        <PostCardActions
          postId={post.id}
          creatorId={post.creator.id}
          isLive={post.creator.isLive}
          likeCount={likeCount}
          commentCount={post.comment_count}
          isLiked={isLiked}
          onLike={handleLike}
          showBorder={false}
          className="mt-0 pt-0"
        />
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
