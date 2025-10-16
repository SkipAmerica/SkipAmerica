import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { supabase } from '@/integrations/supabase/client'

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

interface ThreadsFeedProps {
  hasNotificationZone?: boolean
}

export function ThreadsFeed({ hasNotificationZone = false }: ThreadsFeedProps) {
  const [posts, setPosts] = useState<ThreadPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('creator_content')
        .select(`
          id,
          content_type,
          title,
          description,
          media_url,
          thumbnail_url,
          provider,
          playback_id,
          view_count,
          like_count,
          comment_count,
          published_at,
          created_at,
          social_accounts!inner (
            platform,
            profiles!inner (
              id,
              full_name,
              avatar_url,
              username
            )
          )
        `)
        .order('published_at', { ascending: false })
        .limit(50)

      if (!mounted) return
      if (error) {
        console.error('Error fetching posts:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      // Transform data to match ThreadPost interface
      const transformedPosts = (data || []).map((post: any) => ({
        id: post.id,
        content_type: post.content_type,
        title: post.title,
        description: post.description,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        provider: post.provider,
        playback_id: post.playback_id,
        view_count: post.view_count || 0,
        like_count: post.like_count || 0,
        comment_count: post.comment_count || 0,
        published_at: post.published_at,
        created_at: post.created_at,
        creator: {
          id: post.social_accounts?.profiles?.id || '',
          full_name: post.social_accounts?.profiles?.full_name || 'Creator',
          avatar_url: post.social_accounts?.profiles?.avatar_url,
          username: post.social_accounts?.profiles?.username,
        },
        platform: post.social_accounts?.platform || 'skip_native',
      }))

      setPosts(transformedPosts)
      setLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load posts: {error}
      </div>
    )
  }

  if (!posts.length) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No posts yet. Be the first to share something!
      </div>
    )
  }

  return (
      <div 
        className={`w-full pb-0 px-3 ${hasNotificationZone ? '' : 'pt-24 md:pt-36'}`}
        style={{
          background: 'var(--gradient-feed)',
          ...(hasNotificationZone ? { paddingTop: 'var(--feed-top-spacing)' } : {})
        }}
      >
      <div className="space-y-3">
        {posts.map((post, index) => (
          <PostCard 
            key={post.id} 
            post={post} 
            isLast={index === posts.length - 1}
          />
        ))}
      </div>
    </div>
  )
}