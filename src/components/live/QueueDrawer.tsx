import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Clock, Phone, AlertTriangle, RotateCcw, Wifi, WifiOff, Video } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { useLive } from '@/hooks/live'
import { cn } from '@/lib/utils'
import { RUNTIME } from '@/config/runtime'
import CreatorPreviewWithChat from '@/components/creator/CreatorPreviewWithChat'
import { QueueContent } from '@/components/SkipDevTools/QueueContent'
import { ViewportDrawer } from '@/components/SkipDevTools/ViewportDrawer'
import { teardownMedia } from '@/shared/media'

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
  const lobbyCreatorId = useMemo(() => user?.id || "", [user?.id]);
  const abortControllerRef = useRef<AbortController>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
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

  /**
   * Closes the QueueDrawer and conditionally cleans up media resources.
   * 
   * Cleanup conditions:
   * - SKIP cleanup if in SESSION_PREP, SESSION_JOINING, or SESSION_ACTIVE
   * - SKIP cleanup if actively broadcasting to lobby
   * - PERFORM cleanup only in DISCOVERABLE state with no active broadcast
   * - Cleanup already handled by FSM if transitioning to OFFLINE
   */
  const handleClose = useCallback(async () => {
    const currentState = store.state;
    const isActiveBroadcast = store.isLobbyBroadcasting;
    
    // Guard: NEVER cleanup during active sessions
    const isActiveSession = [
      'SESSION_PREP',
      'SESSION_JOINING', 
      'SESSION_ACTIVE'
    ].includes(currentState);
    
    console.log('[QueueDrawer] Close requested', {
      state: currentState,
      isLobbyBroadcasting: isActiveBroadcast,
      willCleanup: !isActiveSession && !isActiveBroadcast
    });
    
    if (isActiveSession || isActiveBroadcast) {
      console.log('[QueueDrawer] Skipping media cleanup - active session or broadcast');
      onClose();
      return;
    }
    
    // Safe to clean up - user is just browsing queue in DISCOVERABLE state
    if (currentState === 'DISCOVERABLE') {
      console.log('[QueueDrawer] Cleaning up media for DISCOVERABLE state');
      try {
        await teardownMedia();
        console.log('[QueueDrawer] Media cleanup complete');
      } catch (error) {
        console.error('[QueueDrawer] Error during media cleanup:', error);
      }
    }
    
    onClose();
  }, [onClose, store.state, store.isLobbyBroadcasting])

  return (
      <ViewportDrawer
        isOpen={isOpen}
        onClose={handleClose}
        config={{ size: 'full', variant: 'default', dismissible: true, peekMode: false }}
        footer={null}
      >
        <QueueContent />
    </ViewportDrawer>
  )
}