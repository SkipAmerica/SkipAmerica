import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Phone, AlertTriangle, RotateCcw, Users } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { VideoFullscreenModal } from '@/components/shared/VideoFullscreenModal'
import { NextUserPreview } from '@/components/queue/NextUserPreview'
import { CreatorQueueChat } from '@/components/queue/CreatorQueueChat'
import { CollapsibleChat } from '@/components/queue/CollapsibleChat'
import { SwipeableQueueCard } from '@/components/queue/SwipeableQueueCard'
import { CreatorBroadcastFullscreen } from '@/components/queue/CreatorBroadcastFullscreen'
import { isMobile } from '@/shared/lib/platform'
import { useLiveStore } from '@/stores/live-store'

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
  const { isLobbyBroadcasting } = useLiveStore()
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
  const [showNotification, setShowNotification] = useState(false)
  const [fanMuted, setFanMuted] = useState(true)

  // Auto-mute fan when creator starts broadcasting
  useEffect(() => {
    if (isLobbyBroadcasting && !fanMuted) {
      setFanMuted(true)
      toast({
        title: "Fan audio muted",
        description: "Audio muted during your broadcast",
        duration: 3000,
      })
    }
  }, [isLobbyBroadcasting, fanMuted, toast])

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
      
      // Get queue entries in pure FCFS order (first come, first served)
      const { data: queueData, error: queueError } = await supabase
        .from('call_queue')
        .select('*, discussion_topic')
        .eq('creator_id', user.id)
        .eq('status', 'waiting')
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
          
          // Filter out heartbeat-only updates to prevent unnecessary refetches
          if (payload.eventType === 'UPDATE') {
            const oldRecord = payload.old as any
            const newRecord = payload.new as any
            
            if (oldRecord && newRecord) {
              // Get keys that actually changed
              const changedKeys = Object.keys(newRecord).filter(
                key => newRecord[key] !== oldRecord[key]
              )
              
              // If only last_seen changed, it's just a heartbeat - ignore it
              if (changedKeys.length === 1 && changedKeys[0] === 'last_seen') {
                console.log('[QueueContent] Ignoring heartbeat-only update')
                return
              }
            }
          }
          
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

  // Show notification when first entry appears
  useEffect(() => {
    if (state.entries.length > 0) {
      setShowNotification(true)
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 8000)
      
      return () => clearTimeout(timer)
    }
  }, [state.entries[0]?.id])

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
  
  const handleMuteToggle = useCallback(() => {
    setFanMuted(prev => !prev)
  }, [])
  
  const handleStartCall = useCallback(() => {
    if (state.entries[0]) {
      console.log("Starting call with:", state.entries[0].fan_id)
    }
  }, [state.entries])

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
            {state.entries.length > 0 && (() => {
              console.log('[QueueContent] 🎬 Rendering NextUserPreview for fan:', {
                fanId: state.entries[0].fan_id,
                creatorId: user.id,
                fanName: state.entries[0].profiles?.full_name
              });
              return (
                <div className="sticky top-0 bg-background z-10 pb-3 shadow-sm">
                  <SwipeableQueueCard
                  nextUpPanel={
                    <div className="flex flex-col h-full">
                      {/* Row 1: Video */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col">
                            <p className="text-sm text-primary font-medium">
                              Next Up
                            </p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {state.entries[0].profiles?.full_name || 'Anonymous User'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <p className="text-xs text-muted-foreground">
                              Swipe to Go Live
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              In Your Lobby
                              <span className="text-primary">→</span>
                            </p>
                          </div>
                        </div>
                        <NextUserPreview
                          key="lobby-preview"
                          userId={state.entries[0].fan_id}
                          creatorId={user.id}
                          userName={state.entries[0].profiles?.full_name}
                          discussionTopic={state.entries[0].discussion_topic}
                          waitTime={state.entries[0].estimated_wait_minutes}
                          muted={fanMuted}
                          onMuteToggle={handleMuteToggle}
                          disableMuteToggle={isLobbyBroadcasting}
                          onStartCall={handleStartCall}
                          onFullscreen={() => handleFullscreen(state.entries[0].fan_id)}
                        />
                      </div>

                      {/* Row 2: Collapsible Chat */}
                      <CollapsibleChat className="border-t">
                        <CreatorQueueChat
                          creatorId={user.id}
                          fanId={state.entries[0].fan_id}
                        />
                      </CollapsibleChat>

                      {/* Row 3: Remaining Queue */}
                      <div className="flex-1 overflow-y-auto pt-3 px-4 pb-4">
                        {state.entries.length > 1 ? (
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
                                      <AvatarImage src={entry.profiles?.avatar_url || undefined} />
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
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                              <Users className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              No one else waiting
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              You'll see the next fans here
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  }
                  broadcastPanel={
                    <CreatorBroadcastFullscreen
                      creatorId={user.id}
                    />
                  }
                  onBroadcastClose={() => {
                    console.log('[QueueContent] Switching back to Panel 1');
                  }}
                />
              </div>
            );
          })()}
          </div>
        )}
      </div>
      
      {/* Fullscreen Modal */}
      {fullscreenUserId && user && (
        <VideoFullscreenModal
          userId={fullscreenUserId}
          chatCreatorId={user.id}
          isOpen={isFullscreenOpen}
          onClose={handleCloseFullscreen}
          userName={state.entries.find(e => e.fan_id === fullscreenUserId)?.profiles?.full_name || "User"}
          chatParticipantFilter={fullscreenUserId}
          viewerIsCreator={true}
        />
      )}
    </div>
  )
}