import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Clock, Phone, AlertTriangle, RotateCcw, Wifi, WifiOff, Video, GripHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useLive } from '@/hooks/live'
import { cn } from '@/lib/utils'
import { RUNTIME } from '@/config/runtime'
import LobbyBroadcastPanel from './LobbyBroadcastPanel'
import CreatorPreviewWithChat from '@/components/creator/CreatorPreviewWithChat'

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

interface QueueDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type DrawerState = 'collapsed' | 'peek' | 'expanded'

interface QueueState {
  entries: QueueEntry[]
  loading: boolean
  error: string | null
  retryCount: number
  isConnected: boolean
}

export function QueueDrawer({ isOpen, onClose }: QueueDrawerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { store } = useLive()
  
  // QueueDrawer.tsx – ensure CreatorPreviewWithChat uses the SAME id PQ uses
  // Use the authenticated user ID as the lobby creator ID (creator's own panel)
  const lobbyCreatorId = user?.id || "";
  console.log("[CREATOR PANEL] lobbyCreatorId =", lobbyCreatorId);
  const abortControllerRef = useRef<AbortController>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Draggable drawer state
  const [drawerState, setDrawerState] = useState<DrawerState>('collapsed')
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  
  const [state, setLocalState] = useState<QueueState>({
    entries: [],
    loading: false,
    error: null,
    retryCount: 0,
    isConnected: true
  })
  const [processingInvite, setProcessingInvite] = useState(false)
  const [activeInvite, setActiveInvite] = useState<QueueEntry | null>(null)

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
      console.log('[QueueDrawer] Fetching queue entries for creator:', user.id)
      
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

      console.log('[QueueDrawer] Raw queue data:', queueData)

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

        console.log('[QueueDrawer] Enriched queue entries:', enrichedEntries)
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
        console.log('[QueueDrawer] Request aborted (normal cleanup)')
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
    if (!isOpen || !user) return

    console.log('[QueueDrawer] Setting up real-time subscription')
    
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
          console.log('[QueueDrawer] Real-time queue change:', payload)
          // Debounced refetch to prevent rapid successive calls
          debouncedFetch()
        }
      )
      .subscribe()

    // Initial fetch
    fetchQueue()

    return () => {
      console.log('[QueueDrawer] Cleaning up real-time subscription')
      clearTimeout(fetchTimeout)
      if ((window as any).__allow_ch_teardown) {
        try { supabase.removeChannel(channel); } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
    }
  }, [isOpen, user, fetchQueue])

  const handleStartCall = useCallback(async (queueEntry: QueueEntry) => {
    if (!user || processingInvite) return

    try {
      setProcessingInvite(true)
      
      // Set active invite and transition to SESSION_PREP
      setActiveInvite(queueEntry)
      store.dispatch({ type: 'ENTER_PREP' })
      
      toast({
        title: "Starting Pre-Call",
        description: `Preparing session with ${queueEntry.profiles?.full_name || 'user'}`,
      })
      
      // Close drawer after successful transition
      onClose()
      
    } catch (error: any) {
      console.error('Error starting pre-call:', error)
      toast({
        title: "Failed to Start Pre-Call", 
        description: error.message || "Failed to start pre-call. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingInvite(false)
    }
  }, [user, processingInvite, store, toast, onClose])

  const handleRetry = useCallback(() => {
    setLocalState(prev => ({ ...prev, retryCount: 0 }))
    fetchQueue(true)
  }, [fetchQueue])

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

  // Draggable drawer handlers
  const getDrawerHeight = useCallback(() => {
    switch (drawerState) {
      case 'collapsed':
        return 120 // Just the handle (first entry)
      case 'peek':
        return Math.min(window.innerHeight * 0.4, 400) // 40% of screen
      case 'expanded':
        return Math.min(window.innerHeight * 0.9, 800) // 90% of screen
      default:
        return 120
    }
  }, [drawerState])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      setTouchStart({ y: touch.clientY, time: Date.now() })
      setIsScrolling(false)
      setIsDragging(false)
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    if (!touch) return

    const deltaY = touchStart.y - touch.clientY // Positive = drag up, negative = drag down
    const absDeltaY = Math.abs(deltaY)
    const deltaTime = Date.now() - touchStart.time

    // Start dragging if significant vertical movement
    if (absDeltaY > 10 && !isScrolling) {
      setIsDragging(true)
      setDragOffset(deltaY)
      e.preventDefault()
    }
  }, [touchStart, isScrolling])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !touchStart) {
      setIsDragging(false)
      setTouchStart(null)
      setDragOffset(0)
      return
    }

    const velocity = dragOffset / (Date.now() - touchStart.time) // px/ms
    const threshold = 50

    // Determine new state based on drag direction and current state
    if (dragOffset > threshold || velocity > 0.3) {
      // Drag up - expand
      if (drawerState === 'collapsed') {
        setDrawerState('peek')
      } else if (drawerState === 'peek') {
        setDrawerState('expanded')
      }
    } else if (dragOffset < -threshold || velocity < -0.3) {
      // Drag down - collapse
      if (drawerState === 'expanded') {
        setDrawerState('peek')
      } else if (drawerState === 'peek') {
        setDrawerState('collapsed')
      }
    }

    setIsDragging(false)
    setTouchStart(null)
    setDragOffset(0)
  }, [isDragging, dragOffset, touchStart, drawerState])

  const handleTap = useCallback(() => {
    if (!isDragging) {
      // Quick tap toggles between collapsed and peek
      if (drawerState === 'collapsed') {
        setDrawerState('peek')
      } else if (drawerState === 'peek') {
        setDrawerState('collapsed')
      }
    }
  }, [drawerState, isDragging])

  // Touch event listeners
  useEffect(() => {
    const handleTouchMoveGlobal = (e: TouchEvent) => handleTouchMove(e)
    const handleTouchEndGlobal = () => handleTouchEnd()

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false })
      document.addEventListener('touchend', handleTouchEndGlobal)
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMoveGlobal)
      document.removeEventListener('touchend', handleTouchEndGlobal)
    }
  }, [isDragging, handleTouchMove, handleTouchEnd])

  // Auto-collapse when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setDrawerState('collapsed')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      ref={drawerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border rounded-t-2xl shadow-2xl transition-all duration-300 ease-out",
        isDragging && "transition-none"
      )}
      style={{
        height: getDrawerHeight() + (isDragging ? dragOffset * 0.5 : 0),
        transform: isDragging ? `translateY(${-dragOffset * 0.1}px)` : undefined
      }}
      aria-describedby="queue-description"
    >
      {/* Drag Handle Area - First Entry */}
      {state.entries.length > 0 && (
        <div
          className={cn(
            "relative p-4 bg-primary/5 border-b border-primary/20 cursor-grab active:cursor-grabbing select-none",
            isDragging && "bg-primary/10"
          )}
          onTouchStart={handleTouchStart}
          onClick={handleTap}
          role="button"
          tabIndex={0}
          aria-label="Drag to expand queue or tap to toggle"
        >
          {/* Drag indicator */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
            <GripHorizontal className="w-6 h-6 text-muted-foreground/50" />
          </div>
          
          {/* First Entry Content */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground"
                  aria-label="Next in line"
                >
                  1
                </div>
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {state.entries[0].profiles?.full_name 
                      ? getInitials(state.entries[0].profiles.full_name)
                      : 'U'
                    }
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="font-semibold text-primary">
                  {state.entries[0].profiles?.full_name || 'Anonymous User'}
                </p>
                {state.entries[0].discussion_topic && (
                  <p className="text-sm text-primary/80 mb-1 font-medium">
                    {state.entries[0].discussion_topic}
                  </p>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                  <span aria-label={`Estimated wait time: ${formatWaitTime(state.entries[0].estimated_wait_minutes)}`}>
                    Wait: {formatWaitTime(state.entries[0].estimated_wait_minutes)}
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleStartCall(state.entries[0])
              }}
              disabled={processingInvite}
              className="bg-live hover:bg-live/90 text-white disabled:opacity-50 relative z-10"
              aria-label={`Start pre-call with ${state.entries[0].profiles?.full_name || 'user'}`}
            >
              <Phone className="w-4 h-4 mr-1" aria-hidden="true" />
              {processingInvite ? 'Starting...' : 'Start Pre-Call'}
            </Button>
          </div>
        </div>
      )}
      
      {/* Expanded Content - Only show when not collapsed */}
      {drawerState !== 'collapsed' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" aria-hidden="true" />
                <span className="font-semibold">
                  {user?.user_metadata?.full_name ? 
                    `${user.user_metadata.full_name.split(' ')[0]}'s Lobby (${state.entries.length})` : 
                    `Creator Lobby (${state.entries.length})`
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    supabase
                      .from('call_queue')
                      .delete()
                      .eq('creator_id', user.id)
                      .eq('status', 'waiting')
                      .then(() => {
                        toast({
                          title: "Queue cleared",
                          description: "All users have been removed from the queue"
                        })
                      })
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear Queue
                </Button>
                {state.isConnected ? (
                  <Wifi className="w-4 h-4 text-muted-foreground" aria-label="Connected" />
                ) : (
                  <WifiOff className="w-4 h-4 text-destructive" aria-label="Disconnected" />
                )}
              </div>
            </div>
            <p id="queue-description" className="text-sm text-muted-foreground mt-1">
              Manage your call queue and connect with waiting fans
            </p>
            
            {/* Broadcast Toggle Button */}
            <Button
              onClick={(e) => {
                e.stopPropagation()
                store.setLobbyBroadcasting(!store.isLobbyBroadcasting)
              }}
              variant={store.isLobbyBroadcasting ? "destructive" : "default"}
              className="w-full mt-3"
              aria-pressed={store.isLobbyBroadcasting}
            >
              <Video className="w-4 h-4 mr-2" />
              {store.isLobbyBroadcasting ? "End Broadcast" : "Broadcast to Lobby"}
            </Button>
          </div>

          {/* Broadcast Panel */}
          {store.isLobbyBroadcasting && (
            <div className="flex-shrink-0 px-4">
              <LobbyBroadcastPanel 
                onEnd={() => store.setLobbyBroadcasting(false)}
              />
            </div>
          )}

          {/* Creator Preview with Chat - Only in expanded mode */}
          {drawerState === 'expanded' && (
            <div className="px-4 py-2 flex-shrink-0">
              {lobbyCreatorId ? (
                <CreatorPreviewWithChat creatorId={lobbyCreatorId} />
              ) : (
                <div className="text-sm text-red-400">Missing creator id; overlay disabled.</div>
              )}
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Error State */}
            {state.error && (
              <Alert variant="destructive" className="mx-4 mb-4 flex-shrink-0">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{state.error}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRetry()
                    }}
                    disabled={state.loading}
                    className="ml-2 h-7 px-2 text-xs"
                    aria-label="Retry loading queue"
                  >
                    <RotateCcw className={cn("h-3 w-3 mr-1", state.loading && "animate-spin")} />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {state.loading && !state.error ? (
              <div className="flex items-center justify-center py-8" role="status" aria-label="Loading queue">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : state.entries.length === 0 && !state.error ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-50" aria-hidden="true" />
                <p className="font-medium">No one in queue yet</p>
                <p className="text-sm">Fans will appear here when they join</p>
              </div>
            ) : (
              /* Remaining Entries - Only show if more than 1 entry */
              state.entries.length > 1 && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="space-y-3 p-4 pb-8" role="list" aria-label="Waiting queue entries">
                    {state.entries.slice(1).map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        role="listitem"
                        aria-labelledby={`queue-entry-${index + 2}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary"
                              aria-label={`Position ${index + 2}`}
                            >
                              {index + 2}
                            </div>
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {entry.profiles?.full_name 
                                  ? getInitials(entry.profiles.full_name)
                                  : 'U'
                                }
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <p id={`queue-entry-${index + 2}`} className="font-medium">
                              {entry.profiles?.full_name || 'Anonymous User'}
                            </p>
                            {entry.discussion_topic && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {entry.discussion_topic}
                              </p>
                            )}
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                              <span aria-label={`Estimated wait time: ${formatWaitTime(entry.estimated_wait_minutes)}`}>
                                Wait: {formatWaitTime(entry.estimated_wait_minutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}