import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useIntersectionObserver } from '@/shared/hooks/use-intersection-observer'
import { useDebouncedSearch } from '@/shared/hooks/use-debounced-search'
import { PostCard } from './PostCard'
import { LoadingSpinner } from '@/shared/ui'

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

export function ThreadsFeed() {
  const [posts, setPosts] = useState<ThreadPost[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  const fetchPosts = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('creator_content')
        .select(`
          id,
          title,
          description,
          content_type,
          media_url,
          thumbnail_url,
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
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (error) throw error

      const formattedPosts: ThreadPost[] = data?.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        content_type: post.content_type,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        view_count: post.view_count || 0,
        like_count: post.like_count || 0,
        comment_count: post.comment_count || 0,
        published_at: post.published_at,
        created_at: post.created_at,
        creator: {
          id: post.social_accounts.profiles.id,
          full_name: post.social_accounts.profiles.full_name,
          avatar_url: post.social_accounts.profiles.avatar_url,
          username: post.social_accounts.profiles.full_name
        },
        platform: post.social_accounts.platform
      })) || []

      if (reset) {
        setPosts(formattedPosts)
      } else {
        setPosts(prev => [...prev, ...formattedPosts])
      }

      setHasMore(formattedPosts.length === PAGE_SIZE)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMoreRef = useRef<HTMLDivElement>(null)
  // Update the ref for intersection observer
  useEffect(() => {
    if (loadMoreRef.current) {
      // Use our own ref with the intersection observer
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasMore && !loading) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchPosts(nextPage)
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      )

      if (loadMoreRef.current) {
        observer.observe(loadMoreRef.current)
      }

      return () => observer.disconnect()
    }
  }, [hasMore, loading, page, fetchPosts])

  // Initial load
  useEffect(() => {
    fetchPosts(0, true)
  }, [fetchPosts])

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="space-y-0">
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            isLast={index === posts.length - 1}
          />
        ))}
        
        {hasMore && (
          <div ref={loadMoreRef} className="flex items-center justify-center py-4">
            {loading && <LoadingSpinner />}
          </div>
        )}
        
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            You've reached the end of the feed
          </div>
        )}
      </div>
    </div>
  )
}