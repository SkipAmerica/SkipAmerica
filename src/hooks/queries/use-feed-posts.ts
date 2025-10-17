import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'

export type FeedPost = {
  id: string
  content_type: 'text' | 'image' | 'video'
  title: string | null
  description: string | null
  media_url: string | null
  thumbnail_url: string | null
  provider: 'supabase' | 'mux' | null
  playback_id: string | null
  mux_upload_id: string | null
  media_status?: string
  duration_sec?: number | null
  aspect_ratio?: string | null
  metadata?: any
  view_count: number
  like_count: number
  comment_count: number
  published_at: string | null
  created_at: string
  social_accounts: {
    platform: string
    user_id: string
    profiles: { 
      id: string
      full_name: string | null
      avatar_url: string | null
      username?: string | null
    }
  }
  creator_headline?: string | null
  creator_categories?: string[] | null
}

const POSTS_PER_PAGE = 20

async function fetchPosts(pageParam: number): Promise<FeedPost[]> {
  // Phase 2: Verify auth before query
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }
  
  const from = pageParam * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

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
      mux_upload_id,
      media_status,
      duration_sec,
      aspect_ratio,
      metadata,
      view_count,
      like_count,
      comment_count,
      published_at,
      created_at,
      social_accounts!inner (
        platform,
        user_id,
        profiles!inner (
          id,
          full_name,
          avatar_url,
          username
        )
      )
    `)
    .order('published_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const rows = (data ?? []) as FeedPost[]
  const userIds = rows.map(r => r.social_accounts.user_id)
  
  if (userIds.length > 0) {
    const { data: creatorsData } = await supabase
      .from('creators')
      .select('id, headline, categories')
      .in('id', userIds)
    
    const creatorsMap = new Map(creatorsData?.map(c => [c.id, c]) || [])
    
    rows.forEach(r => {
      const creatorInfo = creatorsMap.get(r.social_accounts.user_id)
      if (creatorInfo) {
        r.creator_headline = creatorInfo.headline
        r.creator_categories = creatorInfo.categories
      }
    })
  }
  
  return rows
}

export function useFeedPosts() {
  const queryClient = useQueryClient()
  const { user, session } = useAuth()

  const query = useInfiniteQuery({
    queryKey: ['feed-posts'],
    queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === POSTS_PER_PAGE ? allPages.length : undefined
    },
    initialPageParam: 0,
    // Phase 2: Only run query when authenticated
    enabled: !!user && !!session?.access_token,
    // Phase 2: Optimized caching strategy
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    refetchInterval: false, // Disable polling - use realtime subscriptions instead
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
    retry: 1, // Only retry once on failure
  })

  // Realtime subscriptions for live updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime-creator-content')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'creator_content' 
      }, async (payload) => {
        const id = (payload.new as any)?.id as string | undefined
        if (!id) return
        
        // Hydrate full post with joins
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
            mux_upload_id,
            media_status,
            duration_sec,
            aspect_ratio,
            metadata,
            view_count,
            like_count,
            comment_count,
            published_at,
            created_at,
            social_accounts!inner (
              platform,
              user_id,
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
          const post = data as FeedPost
          
          // Fetch creator info
          const { data: creatorData } = await supabase
            .from('creators')
            .select('headline, categories')
            .eq('id', post.social_accounts.user_id)
            .single()
          
          if (creatorData) {
            post.creator_headline = creatorData.headline
            post.creator_categories = creatorData.categories
          }
          
          // Optimistically prepend to cache
          queryClient.setQueryData(['feed-posts'], (old: any) => {
            if (!old?.pages) return old
            
            const newPages = [...old.pages]
            if (newPages[0]) {
              newPages[0] = [post, ...newPages[0]]
            }
            
            return { ...old, pages: newPages }
          })
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'creator_content' 
      }, (payload) => {
        const row = payload.new as any
        if (!row?.id) return
        
        // Update cached post data
        queryClient.setQueryData(['feed-posts'], (old: any) => {
          if (!old?.pages) return old
          
          const newPages = old.pages.map((page: FeedPost[]) => 
            page.map(p => p.id === row.id ? {
              ...p,
              like_count: row.like_count,
              comment_count: row.comment_count,
              view_count: row.view_count,
              media_status: row.media_status,
              provider: row.provider,
              playback_id: row.playback_id,
              media_url: row.media_url,
              mux_upload_id: row.mux_upload_id,
              duration_sec: row.duration_sec,
              aspect_ratio: row.aspect_ratio,
              metadata: row.metadata
            } : p)
          )
          
          return { ...old, pages: newPages }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Listen for content deletion
  useEffect(() => {
    const handleContentDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ contentId: string }>
      const { contentId } = customEvent.detail
      
      queryClient.setQueryData(['feed-posts'], (old: any) => {
        if (!old?.pages) return old
        
        const newPages = old.pages.map((page: FeedPost[]) => 
          page.filter(p => p.id !== contentId)
        )
        
        return { ...old, pages: newPages }
      })
    }

    window.addEventListener('content-deleted', handleContentDeleted)
    return () => {
      window.removeEventListener('content-deleted', handleContentDeleted)
    }
  }, [queryClient])

  // Flatten pages into single array
  const posts = query.data?.pages.flat() ?? []

  return {
    posts,
    ...query,
  }
}
