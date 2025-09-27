import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Clock, Phone, AlertTriangle, RotateCcw, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useLive } from '@/hooks/live'
import { cn } from '@/lib/utils'

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

// QueueDrawer is now a self-contained bottom panel - no props needed

interface QueueState {
  entries: QueueEntry[]
  loading: boolean
  error: string | null
  retryCount: number
  isConnected: boolean
}

export function QueueDrawer() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { store } = useLive()
  const abortControllerRef = useRef<AbortController>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const gestureRef = useRef<HTMLDivElement>(null)
  
  const [state, setLocalState] = useState<QueueState>({
    entries: [],
    loading: false,
    error: null,
    retryCount: 0,
    isConnected: true
  })
  const [processingInvite, setProcessingInvite] = useState(false)
  const [activeInvite, setActiveInvite] = useState<QueueEntry | null>(null)
  
  // Unified draggable panel state
  const panelRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [panelState, setPanelState] = useState({
    panelOffset: 0,
    isDragging: false,
    startY: 0,
    startOffset: 0,
    openHeightPx: 0,
    collapsedOffset: 0
  })

  // Gesture tracking state
  const [gestureState, setGestureState] = useState({
    tracking: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    swiped: false
  })

  // Check if user is creator (simple guard)
  const isCreator = user?.user_metadata?.account_type === 'creator' || user?.user_metadata?.role === 'creator'
  
  // Initialize panel dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (!handleRef.current) return
      
      const handleHeight = handleRef.current.offsetHeight
      const openHeightPx = Math.round(window.innerHeight * 0.6)
      // Start collapsed - only handle visible at bottom
      const collapsedOffset = openHeightPx - handleHeight
      
      setPanelState(prev => ({
        ...prev,
        openHeightPx,
        collapsedOffset,
        // Always start collapsed to show only handle
        panelOffset: collapsedOffset
      }))
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [state.entries.length])
  
  // Panel drag handlers
  const handlePanelPointerDown = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return
    
    // Don't start drag on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return
    
    setPanelState(prev => ({
      ...prev,
      isDragging: true,
      startY: e.clientY,
      startOffset: prev.panelOffset
    }))
    
    e.preventDefault()
  }, [])
  
  const handlePanelPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panelState.isDragging) return
    
    const deltaY = e.clientY - panelState.startY
    const newOffset = Math.max(0, Math.min(panelState.collapsedOffset, panelState.startOffset + deltaY))
    
    setPanelState(prev => ({
      ...prev,
      panelOffset: newOffset
    }))
  }, [panelState.isDragging, panelState.startY, panelState.startOffset, panelState.collapsedOffset])
  
  const handlePanelPointerUp = useCallback(() => {
    if (!panelState.isDragging) return
    
    const threshold = panelState.collapsedOffset * 0.5
    const shouldOpen = panelState.panelOffset < threshold
    
    setPanelState(prev => ({
      ...prev,
      isDragging: false,
      panelOffset: shouldOpen ? 0 : prev.collapsedOffset
    }))
  }, [panelState.isDragging, panelState.panelOffset, panelState.collapsedOffset])
  
  const handlePanelClick = useCallback(() => {
    if (panelState.isDragging) return
    
    const isOpen = panelState.panelOffset === 0
    setPanelState(prev => ({
      ...prev,
      panelOffset: isOpen ? prev.collapsedOffset : 0
    }))
  }, [panelState.isDragging, panelState.panelOffset, panelState.collapsedOffset])

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
    if (!user) return

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
  }, [user, fetchQueue])

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
  }, [user, processingInvite, store, toast])

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

  // Gesture handlers for right-swipe navigation
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track for creators
    if (!isCreator) return
    
    // Only primary pointer (left click/first touch)
    if (!e.isPrimary) return
    
    // Don't track if starting on interactive elements
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return
    
    // Only track if within gesture container
    if (!gestureRef.current?.contains(target)) return
    
    setGestureState({
      tracking: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      swiped: false
    })
  }, [isCreator])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gestureState.tracking) return
    
    const dx = e.clientX - gestureState.startX
    const dy = e.clientY - gestureState.startY
    
    // If too much vertical movement, treat as scroll
    if (Math.abs(dy) > 30) {
      setGestureState(prev => ({ ...prev, tracking: false }))
      return
    }
    
    // Check for right swipe threshold
    if (dx > 80 && Date.now() - gestureState.startTime < 600) {
      setGestureState(prev => ({ ...prev, swiped: true }))
    }
  }, [gestureState])

  const handlePointerUp = useCallback(() => {
    if (gestureState.swiped) {
      window.location.href = '/creator/blank'
    }
    
    setGestureState({
      tracking: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      swiped: false
    })
  }, [gestureState.swiped])

  const handlePointerCancel = useCallback(() => {
    setGestureState({
      tracking: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      swiped: false
    })
  }, [])

  // Only render when there are queue entries
  if (!state.entries.length || state.loading) return null

  return (
    <div
      ref={panelRef}
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto bg-background border-t shadow-2xl"
      style={{
        height: `${panelState.openHeightPx}px`,
        transform: `translateY(${panelState.panelOffset}px)`,
        transition: panelState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Remaining Queue - Hidden Above, Revealed When Dragged Up */}
        {state.entries.length > 1 && (
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">
                {state.entries.length - 1} More in Queue
              </h3>
            </div>
            
            <div className="space-y-2 pb-4">
              {state.entries.slice(1).map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          {getInitials(entry.profiles?.full_name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full border border-background" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {entry.profiles?.full_name || 'Anonymous User'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatWaitTime(entry.estimated_wait_minutes)}
                        </div>
                        <span>#{index + 2} in line</span>
                      </div>
                      {entry.discussion_topic && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted/50 px-2 py-0.5 rounded-full inline-block">
                          {entry.discussion_topic}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartCall(entry)}
                    disabled={processingInvite}
                    size="sm"
                    variant="outline"
                    className="text-xs px-3 h-8"
                    aria-label={`Start call with ${entry.profiles?.full_name || 'user'}`}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Next Up - Drag Handle (Always Visible) */}
        <div
          ref={handleRef}
          className="flex-shrink-0 p-4 border-t bg-background cursor-grab active:cursor-grabbing"
          onPointerDown={handlePanelPointerDown}
          onPointerMove={handlePanelPointerMove}
          onPointerUp={handlePanelPointerUp}
          onPointerCancel={handlePanelPointerUp}
          onClick={handlePanelClick}
          style={{ touchAction: 'none' }}
          aria-expanded={panelState.panelOffset === 0}
          role="button"
          tabIndex={0}
        >
          {/* Drag indicator */}
          <div className="mx-auto w-12 h-1 bg-muted-foreground/30 rounded-full mb-4" />
          
          <div className="relative p-6 rounded-xl border bg-gradient-to-r from-primary/5 to-accent/10 hover:from-primary/10 hover:to-accent/20 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                      {getInitials(state.entries[0].profiles?.full_name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-primary mb-1">NEXT UP</p>
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    {state.entries[0].profiles?.full_name || 'Anonymous User'}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatWaitTime(state.entries[0].estimated_wait_minutes)}
                    </div>
                    {state.entries[0].discussion_topic && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {state.entries[0].discussion_topic}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {state.entries.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    <ChevronUp className="w-3 h-3" />
                    +{state.entries.length - 1} more
                  </div>
                )}
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartCall(state.entries[0])
                  }}
                  disabled={processingInvite}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2"
                  aria-label={`Start call with ${state.entries[0].profiles?.full_name || 'user'}`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {processingInvite ? 'Starting...' : 'Start Call'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}