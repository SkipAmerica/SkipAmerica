import { useState, useEffect, useRef } from 'react'
import { PostCard } from './PostCard'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { supabase } from '@/integrations/supabase/client'

type FeedPost = {
  id: string
  content_type: 'text' | 'image' | 'video'
  title: string | null
  description: string | null
  media_url: string | null
  thumbnail_url: string | null
  provider: 'supabase' | 'mux' | null
  playback_id: string | null
  view_count: number
  like_count: number
  comment_count: number
  published_at: string | null
  created_at: string
  social_accounts: {
    platform: string
    profiles: { 
      id: string
      full_name: string | null
      avatar_url: string | null
      username?: string | null
    }
  }
}

interface ThreadsFeedProps {
  hasNotificationZone?: boolean
  onPostCreated?: (post: FeedPost) => void
}

export function ThreadsFeed({ hasNotificationZone = false }: ThreadsFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedIds = useRef<Set<string>>(new Set())

  // 1) Initial fetch
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
      const rows = (data ?? []) as FeedPost[]
      rows.forEach(r => loadedIds.current.add(r.id))
      setPosts(rows)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  // 2) Realtime: INSERT → prepend, UPDATE → patch counts
  useEffect(() => {
    const channel = supabase
      .channel('realtime-creator-content')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creator_content' }, async (payload) => {
        const id = (payload.new as any)?.id as string | undefined
        if (!id || loadedIds.current.has(id)) return
        
        // Hydrate joins for UI
        const { data } = await supabase
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
          .eq('id', id)
          .single()
        
        if (data) {
          loadedIds.current.add(id)
          setPosts(prev => [data as FeedPost, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'creator_content' }, (payload) => {
        const row = payload.new as any
        if (!row?.id) return
        setPosts(prev => prev.map(p => 
          p.id === row.id 
            ? { ...p, like_count: row.like_count, comment_count: row.comment_count, view_count: row.view_count } 
            : p
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // 3) Expose callback for optimistic prepend (called by post creator)
  const handlePostCreated = (newPost: FeedPost) => {
    if (!newPost?.id) return
    if (!loadedIds.current.has(newPost.id)) {
      loadedIds.current.add(newPost.id)
      setPosts(prev => [newPost, ...prev])
    }
  }

  // Store in window for access by ExpandedPostCreator
  useEffect(() => {
    ;(window as any).__feedPostCreated = handlePostCreated
    return () => {
      delete (window as any).__feedPostCreated
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
      <div className="space-y-3 pt-[10px]">
        {posts.map((post, index) => {
          // Transform FeedPost to ThreadPost for PostCard
          const threadPost = {
            id: post.id,
            content_type: post.content_type,
            title: post.title,
            description: post.description,
            media_url: post.media_url,
            thumbnail_url: post.thumbnail_url,
            provider: post.provider,
            playback_id: post.playback_id,
            view_count: post.view_count,
            like_count: post.like_count,
            comment_count: post.comment_count,
            published_at: post.published_at,
            created_at: post.created_at,
            creator: {
              id: post.social_accounts.profiles.id,
              full_name: post.social_accounts.profiles.full_name || 'Creator',
              avatar_url: post.social_accounts.profiles.avatar_url || undefined,
              username: post.social_accounts.profiles.username || undefined,
            },
            platform: post.social_accounts.platform,
          }
          
          return (
            <PostCard 
              key={post.id} 
              post={threadPost} 
              isLast={index === posts.length - 1}
            />
          )
        })}
      </div>
    </div>
  )
}
