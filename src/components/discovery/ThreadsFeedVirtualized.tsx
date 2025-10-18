import { useRef, useEffect, Profiler, ProfilerOnRenderCallback, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PostCardFactory } from './cards/PostCardFactory'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { useFeedPosts } from '@/hooks/queries/use-feed-posts'
import { FEATURES } from '@/config/features'
import { getContentOffsets, getPullToRefreshOffset } from '@/lib/layout-utils'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { useAuth } from '@/app/providers/auth-provider'
import { useScrollContainer } from '@/shared/providers/ScrollContainerProvider'
import { useIntersectionObserver } from '@/shared/hooks/use-intersection-observer'
import { PullToRefreshContainer } from '@/components/shared/PullToRefreshContainer'
import { useQueryClient } from '@tanstack/react-query'

interface ThreadsFeedProps {
  hasNotificationZone?: boolean
}

export function ThreadsFeedVirtualized({ hasNotificationZone = false }: ThreadsFeedProps) {
  const { user, loading: authLoading, session } = useAuth()
  const { posts, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useFeedPosts()
  
  // Use shared scroll container from provider
  const { rootEl } = useScrollContainer()
  const lastTriggeredAt = useRef<number>(0)
  const queryClient = useQueryClient()
  
  // Calculate offset for pull-to-refresh logo positioning
  const showAdPanel = FEATURES.SHOW_AD_PANEL
  const revealOffset = getPullToRefreshOffset(showAdPanel, hasNotificationZone)
  
  // Handle pull-to-refresh
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
    
    // Haptic feedback on supported devices
    if ('Capacitor' in window) {
      try {
        const { Haptics } = (window as any).Capacitor.Plugins
        await Haptics?.notification({ type: 'success' })
      } catch (e) {
        // Ignore haptic errors
      }
    }
  }

  // Guard: Only initialize virtualizer when rootEl is available
  const rowVirtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => rootEl,
    estimateSize: useCallback(() => 500, []), // Stable estimate callback
    overscan: 3,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 500,
    enabled: !!rootEl,
  })

  // Sentinel-based infinite scroll with debounce
  const sentinel = useIntersectionObserver<HTMLDivElement>({
    root: rootEl,
    threshold: 0,
    rootMargin: '800px',
  })

  useEffect(() => {
    if (sentinel.isIntersecting && hasNextPage && !isFetchingNextPage) {
      const now = Date.now()
      if (now - lastTriggeredAt.current > 250) {
        lastTriggeredAt.current = now
        fetchNextPage()
      }
    }
  }, [sentinel.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Phase 3: Performance monitoring (dev only)
  const onRender: ProfilerOnRenderCallback = useCallback((
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    if (import.meta.env.DEV && actualDuration > 16) {
      console.warn(`[ThreadsFeed Performance] ${phase} render took ${actualDuration.toFixed(2)}ms (target: <16ms for 60fps)`)
    }
  }, [])

  // Phase 3: Development-only debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ThreadsFeed Debug]', {
        authLoading,
        hasUser: !!user,
        userId: user?.id,
        hasSession: !!session,
        hasToken: !!session?.access_token,
        isLoading,
        postsCount: posts.length,
      })
    }
  }, [authLoading, user?.id, session?.access_token, isLoading, posts.length])

  // Guard: Show placeholder while waiting for rootEl
  if (!rootEl) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  // Phase 5: Simplified loading states - only gate when no cached posts
  if (authLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground ml-2">Authenticating...</p>
      </div>
    )
  }

  if (!authLoading && !user) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please sign in to view posts.
      </div>
    )
  }

  // Only show loading spinner on initial load when no posts exist
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground ml-2">Loading posts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load posts: {error.message}
      </div>
    )
  }

  // Phase 5: Empty state with clear message
  if (posts.length === 0 && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-lg font-medium mb-2">No posts yet</div>
        <p className="text-muted-foreground">
          Be the first to share something with the community!
        </p>
      </div>
    )
  }

  const offsets = getContentOffsets(FEATURES.SHOW_AD_PANEL)
  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <PullToRefreshContainer
      onRefresh={handleRefresh}
      scrollElement={rootEl}
      revealAreaOffset={revealOffset}
    >
      <Profiler id="ThreadsFeed" onRender={onRender}>
        <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
          {virtualItems.map((virtualRow) => {
            const post = posts[virtualRow.index]
            if (!post) return null

            // Transform FeedPost to ThreadPost
            const threadPost = {
              id: post.id,
              content_type: post.content_type,
              title: post.title,
              description: post.description,
              media_url: post.media_url,
              thumbnail_url: post.thumbnail_url,
              provider: post.provider,
              playback_id: post.playback_id,
              mux_upload_id: post.mux_upload_id,
              media_status: post.media_status,
              duration_sec: post.duration_sec,
              aspect_ratio: post.aspect_ratio,
              metadata: post.metadata,
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
                title: post.creator_headline || undefined,
                industry: post.creator_categories?.[0] || undefined,
              },
              platform: post.social_accounts.platform,
            }

            return (
              <div
                key={post.id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement} // Phase 1: Enable dynamic measurement
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ErrorBoundary fallback={<div className="p-4 text-muted-foreground">Failed to load post</div>}>
                  <PostCardFactory 
                    post={threadPost} 
                    isLast={virtualRow.index === posts.length - 1}
                  />
                </ErrorBoundary>
                
                {/* Divider */}
                <div className="border-b border-border" />
              </div>
            )
          })}

          {/* Bottom sentinel for infinite scroll */}
          <div
            ref={sentinel.ref}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '1px',
              transform: `translateY(${rowVirtualizer.getTotalSize()}px)`,
            }}
          />
        </div>

      {/* Phase 5: Background loading indicator */}
        {isFetchingNextPage && posts.length > 0 && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-fit bg-background/80 backdrop-blur rounded-full px-4 py-2 shadow-lg z-50">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </Profiler>
    </PullToRefreshContainer>
  )
}
