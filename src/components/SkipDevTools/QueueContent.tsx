import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Phone, AlertTriangle, RotateCcw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { UserVideoSFU } from '@/components/shared/UserVideoSFU'
import { VideoFullscreenModal } from '@/components/shared/VideoFullscreenModal'
import { isMobile } from '@/shared/lib/platform'

interface QueueEntry {
  id: string
  fan_id: string
  joined_at: string
  estimated_wait_minutes: number
  discussion_topic?: string
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
}

interface QueueState {
  entries: QueueEntry[]
  loading: boolean
  error: string | null
  retryCount: number
  isConnected: boolean
}

export function QueueContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [state, setLocalState] = useState<QueueState>({
    entries: [],
    loading: false,
    error: null,
    retryCount: 0,
    isConnected: true
  })

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const fetchQueue = useCallback(async (isRetry = false) => {
    if (!user) return

    // Clean abort of previous request if it exists
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort()
    }
    
    // Create new controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setLocalState(prev => ({ 
      ...prev, 
      loading: true, 
      error: isRetry ? null : prev.error,
      isConnected: true
    }))

    try {
      console.log('[QueueContent] Fetching queue entries for creator:', user.id)
      
      // Check if we've been aborted before making request
      if (abortController.signal.aborted) return
      
      // First get queue entries, prioritizing by priority field first
      const { data: queueData, error: queueError } = await supabase
        .from('call_queue')
        .select('*, discussion_topic, priority')
        .eq('creator_id', user.id)
        .eq('status', 'waiting')
        .order('priority', { ascending: false })
        .order('joined_at', { ascending: true })
        .abortSignal(abortController.signal)

      // Check abort again after database call
      if (abortController.signal.aborted) return

      console.log('[QueueContent] Raw queue data:', queueData)

      if (queueError && queueError.code !== 'PGRST116') { // Ignore empty result errors
        const wrappedError = new Error(`Failed to fetch queue entries: ${queueError.message}`)
        wrappedError.name = 'DatabaseError'
        ;(wrappedError as any).code = queueError.code
        throw wrappedError
      }

      // Then get profiles for each fan_id
      let enrichedEntries: QueueEntry[] = []
      if (queueData?.length > 0 && !abortController.signal.aborted) {
        const fanIds = queueData.map(entry => entry.fan_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', fanIds)
          .abortSignal(abortController.signal)

        // Final abort check
        if (abortController.signal.aborted) return

        if (profilesError && profilesError.code !== 'PGRST116') {
          console.warn('Error fetching profiles:', profilesError)
          // Continue with queue data even if profiles fail
        }

        enrichedEntries = queueData.map(entry => ({
          ...entry,
          profiles: profilesData?.find(profile => profile.id === entry.fan_id)
        }))

        console.log('[QueueContent] Enriched queue entries:', enrichedEntries)
      }

      // Only update state if not aborted
      if (!abortController.signal.aborted) {
        setLocalState(prev => ({
          ...prev,
          entries: enrichedEntries,
          loading: false,
          error: null,
          retryCount: 0,
          isConnected: true
        }))
      }

    } catch (error: any) {
      // Ignore AbortError - this is normal when leaving queue or component cleanup
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log('[QueueContent] Request aborted (normal cleanup)')
        return
      }
      
      console.error('Error fetching queue:', error)
      
      setLocalState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load queue',
        retryCount: prev.retryCount + 1,
        isConnected: false
      }))

      // Auto-retry with exponential backoff (max 2 retries)
      if (state.retryCount < 2 && !abortController.signal.aborted) {
        const delay = Math.min(2000 * Math.pow(2, state.retryCount), 6000)
        retryTimeoutRef.current = setTimeout(() => {
          if (!abortController.signal.aborted) {
            fetchQueue(true)
          }
        }, delay)
      }
    }
  }, [user, state.retryCount])

  // Setup real-time subscription for queue changes with debounced fetching
  useEffect(() => {
    if (!user) return

    console.log('[QueueContent] Setting up real-time subscription')
    
    let fetchTimeout: NodeJS.Timeout
    
    const debouncedFetch = () => {
      clearTimeout(fetchTimeout)
      fetchTimeout = setTimeout(() => {
        fetchQueue()
      }, 500) // Debounce multiple rapid changes
    }
    
    const channel = supabase
      .channel('queue-entries-subscription')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[QueueContent] Real-time queue change:', payload)
          // Debounced refetch to prevent rapid successive calls
          debouncedFetch()
        }
      )
      .subscribe()

    // Initial fetch
    fetchQueue()

    return () => {
      console.log('[QueueContent] Cleaning up real-time subscription')
      clearTimeout(fetchTimeout)
      supabase.removeChannel(channel)
    }
  }, [user, fetchQueue])

  const handleRetry = useCallback(() => {
    setLocalState(prev => ({ ...prev, retryCount: 0 }))
    fetchQueue(true)
  }, [fetchQueue])

  const handleFullscreen = useCallback((userId: string) => {
    setFullscreenUserId(userId)
    setIsFullscreenOpen(true)
  }, [])

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreenOpen(false)
    setFullscreenUserId(null)
  }, [])

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="font-medium">Please sign in</p>
        <p className="text-sm">You need to be signed in to view your queue</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error State */}
        {state.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{state.error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={state.loading}
                className="ml-2 h-7 px-2 text-xs"
              >
                <RotateCcw className={cn("h-3 w-3 mr-1", state.loading && "animate-spin")} />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {state.loading && !state.error ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : state.entries.length === 0 && !state.error ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="font-medium">No one in queue yet</p>
            <p className="text-sm">Fans will appear here when they join</p>
          </div>
        ) : (
          /* Queue Entries */
          <div className="flex flex-col h-full">
            {/* Sticky First Entry */}
            {state.entries.length > 0 && (
              <div className="sticky top-0 bg-background z-10 pb-3 border-b shadow-sm">
                {/* Unified card-style layout */}
                <div className="p-4">
                  {/* Header with Next Up and User Info */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-primary font-medium">
                      Next Up
                    </p>
                    <div className="text-right">
                      <p className="font-semibold text-base leading-tight">
                        {state.entries[0].profiles?.full_name || 'Anonymous User'}
                      </p>
                      {state.entries[0].discussion_topic && (
                        <p className="text-sm text-muted-foreground leading-tight">
                          {state.entries[0].discussion_topic}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative max-w-md mx-auto">
                    <UserVideoSFU
                      userId={state.entries[0].fan_id}
                      role="viewer"
                      dimensions="w-full aspect-video"
                      showChat={false}
                      muted={true}
                      showControls={false}
                      showFullscreenButton={true}
                      fallbackName={state.entries[0].profiles?.full_name || 'User'}
                      className="border border-primary/20 rounded-lg"
                      onFullscreen={() => handleFullscreen(state.entries[0].fan_id)}
                    />
                    {/* Bottom overlay with Start button and wait time */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-lg p-3">
                      <div className="flex items-end justify-between">
                        <p className="text-xs text-white/70">
                          Wait: {formatWaitTime(state.entries[0].estimated_wait_minutes)}
                        </p>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 ml-3 px-4 shrink-0"
                          onClick={() => {
                            console.log("Starting call with:", state.entries[0].fan_id);
                          }}
                        >
                          Start
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Remaining Entries */}
            {state.entries.length > 1 && (
              <div className="flex-1 overflow-y-auto pt-3">
                <div className="space-y-3">
                  {state.entries.slice(1).map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {index + 2}
                          </div>
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10">
                              {entry.profiles?.full_name 
                                ? getInitials(entry.profiles.full_name)
                                : 'U'
                              }
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="font-medium">
                            {entry.profiles?.full_name || 'Anonymous User'}
                          </p>
                          {entry.discussion_topic && (
                            <p className="text-sm text-primary mb-1">
                              {entry.discussion_topic}
                            </p>
                          )}
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>Wait: {formatWaitTime(entry.estimated_wait_minutes)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Fullscreen Modal */}
      {fullscreenUserId && (
        <VideoFullscreenModal
          userId={fullscreenUserId}
          isOpen={isFullscreenOpen}
          onClose={handleCloseFullscreen}
          userName={state.entries.find(e => e.fan_id === fullscreenUserId)?.profiles?.full_name || "User"}
          creatorId={user?.id}
        />
      )}
    </div>
  )
}