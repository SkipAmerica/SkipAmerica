import { PostCardHeader } from './shared/PostCardHeader'
import { PostCardActions } from './shared/PostCardActions'
import { PostCardMedia } from './shared/PostCardMedia'
import { ExpandableCaption } from './shared/ExpandableCaption'
import { DeleteContentDialog } from '@/components/shared/DeleteContentDialog'
import { usePostInteractions } from './shared/usePostInteractions'
import { FollowConnectButtons } from './shared/FollowConnectButtons'
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
    handleConnect,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDelete,
    deleting,
  } = usePostInteractions({
    postId: post.id,
    creatorId: post.creator.id,
    initialLikeCount: post.like_count,
  })

  const caption = post.title || post.description || ''

  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-inter relative overflow-hidden"
      )}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Row 1: Header with Connect Button */}
      <PostCardHeader
        creator={post.creator}
        timestamp={post.published_at || post.created_at}
        isOwnPost={isOwnPost}
        onDelete={() => setShowDeleteDialog(true)}
        variant="row"
        showAvatar={true}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        onConnect={handleConnect}
        showConnectButton={true}
      />

      {/* Connect Button - Overlay on Media */}
      <FollowConnectButtons
        onConnect={handleConnect}
        isOwnPost={isOwnPost}
        variant="overlay"
        className="absolute top-[72px] right-3 z-20"
      />

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
          aspectRatio={post.aspect_ratio || undefined}
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
