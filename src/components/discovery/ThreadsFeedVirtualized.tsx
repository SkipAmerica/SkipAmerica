import { useRef, useEffect, Profiler, ProfilerOnRenderCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PostCardFactory } from './cards/PostCardFactory'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { useFeedPosts } from '@/hooks/queries/use-feed-posts'
import { FEATURES } from '@/config/features'
import { getContentOffsets } from '@/lib/layout-utils'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { useAuth } from '@/app/providers/auth-provider'

interface ThreadsFeedProps {
  hasNotificationZone?: boolean
}

export function ThreadsFeedVirtualized({ hasNotificationZone = false }: ThreadsFeedProps) {
  const { user, loading: authLoading, session } = useAuth()
  const { posts, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useFeedPosts()
  
  console.log('[ThreadsFeed Debug]', {
    authLoading,
    hasUser: !!user,
    userId: user?.id,
    hasSession: !!session,
    hasToken: !!session?.access_token,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message,
    postsCount: posts.length,
    queryEnabled: !!user && !!session?.access_token
  })
  
  const parentRef = useRef<HTMLDivElement>(null)

  // Virtual scrolling - only render visible items + buffer
  const rowVirtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 600, // Estimated post height
    overscan: 3, // Render 3 items before/after viewport
  })

  // Infinite scroll trigger
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse()

    if (!lastItem) return

    if (
      lastItem.index >= posts.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    hasNextPage,
    fetchNextPage,
    posts.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ])

  // Performance monitoring callback
  const onRender: ProfilerOnRenderCallback = (
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
  }

  // Phase 1: Simplified loading states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground ml-2">Authenticating...</p>
      </div>
    )
  }

  if (!user) {
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

  // Debug fallback to catch rendering issues
  if (posts.length === 0 && !isLoading && !error) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No posts yet. Be the first to share something!
        <pre className="text-xs mt-2">{JSON.stringify({ 
          isLoading, 
          isFetchingNextPage, 
          hasNextPage,
          authLoading 
        }, null, 2)}</pre>
      </div>
    )
  }

  // If we have posts, render them regardless of background loading state
  console.log('[ThreadsFeed] Rendering posts:', posts.length)

  const offsets = getContentOffsets(FEATURES.SHOW_AD_PANEL)
  const virtualItems = rowVirtualizer.getVirtualItems()

  // Phase 3: Virtualization debug logging
  console.log('[ThreadsFeed Virtualization]', {
    postsTotal: posts.length,
    virtualItemsCount: virtualItems.length,
    totalHeight: rowVirtualizer.getTotalSize(),
    scrollElement: !!parentRef.current
  })

  return (
    <Profiler id="ThreadsFeed" onRender={onRender}>
      <div 
        ref={parentRef}
        className={`w-full pb-0 ${hasNotificationZone ? '' : offsets.feedPaddingClass}`}
        style={{
          ...(hasNotificationZone ? { paddingTop: 'var(--feed-top-spacing)' } : {}),
          height: '100vh',
          overflowY: 'auto',
          contain: 'strict',
        }}
      >
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
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                data-index={virtualRow.index}
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
        </div>

        {/* Loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </Profiler>
  )
}
