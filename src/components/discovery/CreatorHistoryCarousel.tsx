import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Repeat2, Share, ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSpinner } from '@/shared/ui'
import { cn } from '@/lib/utils'

interface CreatorPost {
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
}

interface CreatorInfo {
  id: string
  full_name: string
  avatar_url?: string
}

interface CreatorHistoryCarouselProps {
  creatorId: string
}

export function CreatorHistoryCarousel({ creatorId }: CreatorHistoryCarouselProps) {
  const [posts, setPosts] = useState<CreatorPost[]>([])
  const [creator, setCreator] = useState<CreatorInfo | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 5

  const fetchCreatorInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', creatorId)
        .single()

      if (error) throw error
      setCreator(data)
    } catch (error) {
      console.error('Error fetching creator info:', error)
    }
  }, [creatorId])

  const fetchCreatorPosts = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
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
            user_id
          )
        `)
        .eq('social_accounts.user_id', creatorId)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (error) throw error

      const formattedPosts: CreatorPost[] = data?.map(post => ({
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
        created_at: post.created_at
      })) || []

      if (reset) {
        setPosts(formattedPosts)
      } else {
        setPosts(prev => [...prev, ...formattedPosts])
      }

      setHasMore(formattedPosts.length === PAGE_SIZE)
    } catch (error) {
      console.error('Error fetching creator posts:', error)
    } finally {
      setLoading(false)
    }
  }, [creatorId])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchCreatorPosts(nextPage)
    }
  }, [hasMore, loading, page, fetchCreatorPosts])

  const goToNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(prev => prev + 1)
      
      // Load more posts when near the end
      if (currentIndex >= posts.length - 2 && hasMore && !loading) {
        loadMore()
      }
    }
  }, [currentIndex, posts.length, hasMore, loading, loadMore])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  useEffect(() => {
    fetchCreatorInfo()
    fetchCreatorPosts(0, true)
  }, [fetchCreatorInfo, fetchCreatorPosts])

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

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-muted-foreground">No posts found for this creator</p>
      </div>
    )
  }

  const currentPost = posts[currentIndex]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} of {posts.length}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNext}
          disabled={currentIndex === posts.length - 1 && !hasMore}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Creator Header */}
      {creator && (
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Avatar className="h-12 w-12">
            <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
            <AvatarFallback>
              {creator.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg">{creator.full_name}</h2>
            <p className="text-muted-foreground text-sm">
              {posts.length} posts
            </p>
          </div>
        </div>
      )}

      {/* Current Post */}
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              {formatTime(currentPost.published_at || currentPost.created_at)}
            </div>
          </div>

          {currentPost.title && (
            <h3 className="font-semibold text-lg leading-relaxed">
              {currentPost.title}
            </h3>
          )}
          
          {currentPost.description && (
            <p className="text-foreground leading-relaxed">
              {currentPost.description}
            </p>
          )}

          {/* Media */}
          {currentPost.media_url && (
            <div className="rounded-lg overflow-hidden">
              {currentPost.content_type.startsWith('image') ? (
                <img
                  src={currentPost.media_url}
                  alt={currentPost.title || 'Post image'}
                  className="w-full h-auto max-h-96 object-cover"
                />
              ) : currentPost.content_type.startsWith('video') ? (
                <video
                  src={currentPost.media_url}
                  poster={currentPost.thumbnail_url}
                  controls
                  className="w-full h-auto max-h-96"
                />
              ) : null}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
                <Heart className="h-4 w-4" />
                <span className="text-sm">{formatCount(currentPost.like_count)}</span>
              </Button>

              <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{formatCount(currentPost.comment_count)}</span>
              </Button>

              <Button variant="ghost" size="sm" className="gap-2 px-0 hover:bg-transparent">
                <Repeat2 className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent">
                <Share className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {formatCount(currentPost.view_count)} views
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}