import { TextPostCard } from './TextPostCard'
import { MediaPostCard } from './MediaPostCard'

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

interface PostCardProps {
  post: ThreadPost
  isLast?: boolean
}

export function PostCardFactory({ post, isLast }: PostCardProps) {
  // Determine if post has media
  const hasMedia = post.media_url || 
                   post.playback_id || 
                   (post.content_type === 'video' && post.media_status === 'processing') ||
                   post.content_type === 'image' ||
                   post.content_type === 'video'
  
  // Select card type based on media presence
  if (hasMedia) {
    return <MediaPostCard post={post} isLast={isLast} />
  }
  
  return <TextPostCard post={post} isLast={isLast} />
}
