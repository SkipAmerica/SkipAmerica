import { useEffect, useState, useCallback, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Clock, Phone, AlertTriangle, RotateCcw, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
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

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setLocalState(prev => ({ 
      ...prev, 
      loading: true, 
      error: isRetry ? null : prev.error,
      isConnected: true
    }))

    try {
      // First get queue entries
      const { data: queueData, error: queueError } = await supabase
        .from('call_queue')
        .select('*, discussion_topic')
        .eq('creator_id', user.id)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })
        .abortSignal(abortController.signal)

      if (queueError) {
        const wrappedError = new Error(`Failed to fetch queue entries: ${queueError.message}`)
        wrappedError.name = 'DatabaseError'
        ;(wrappedError as any).code = queueError.code
        throw wrappedError
      }

      // Then get profiles for each fan_id
      let enrichedEntries: QueueEntry[] = []
      if (queueData?.length > 0) {
        const fanIds = queueData.map(entry => entry.fan_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', fanIds)
          .abortSignal(abortController.signal)

        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError)
          // Continue with queue data even if profiles fail
        }

        enrichedEntries = queueData.map(entry => ({
          ...entry,
          profiles: profilesData?.find(profile => profile.id === entry.fan_id)
        }))
      }

      setLocalState(prev => ({
        ...prev,
        entries: enrichedEntries,
        loading: false,
        error: null,
        retryCount: 0,
        isConnected: true
      }))

    } catch (error: any) {
      if (error.name === 'AbortError') return // Ignore aborted requests
      
      console.error('Error fetching queue:', error)
      
      setLocalState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load queue',
        retryCount: prev.retryCount + 1,
        isConnected: false
      }))

      // Auto-retry with exponential backoff (max 3 retries)
      if (state.retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, state.retryCount), 8000)
        retryTimeoutRef.current = setTimeout(() => {
          fetchQueue(true)
        }, delay)
      }
    }
  }, [user, state.retryCount])

  useEffect(() => {
    if (!isOpen || !user) return
    fetchQueue()
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[60vh] rounded-t-2xl flex flex-col"
        aria-describedby="queue-description"
      >
        <SheetHeader className="pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" aria-hidden="true" />
              {user?.user_metadata?.full_name ? 
                `${user.user_metadata.full_name.split(' ')[0]}'s Lobby (${state.entries.length})` : 
                `Creator Lobby (${state.entries.length})`
              }
            </div>
            <div className="flex items-center gap-2">
              {state.isConnected ? (
                <Wifi className="w-4 h-4 text-muted-foreground" aria-label="Connected" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" aria-label="Disconnected" />
              )}
            </div>
          </SheetTitle>
          <p id="queue-description" className="text-sm text-muted-foreground">
            Manage your call queue and connect with waiting fans
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
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
            /* Queue Entries */
            <div className="space-y-3" role="list" aria-label="Queue entries">
              {state.entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  role="listitem"
                  aria-labelledby={`queue-entry-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary"
                        aria-label={`Position ${index + 1}`}
                      >
                        {index + 1}
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
                      <p id={`queue-entry-${index}`} className="font-medium">
                        {entry.profiles?.full_name || 'Anonymous User'}
                      </p>
                      {entry.discussion_topic && (
                        <p className="text-sm text-primary mb-1">
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

                  {index === 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleStartCall(entry)}
                      disabled={processingInvite}
                      className="bg-live hover:bg-live/90 text-white disabled:opacity-50"
                      aria-label={`Start pre-call with ${entry.profiles?.full_name || 'user'}`}
                    >
                      <Phone className="w-4 h-4 mr-1" aria-hidden="true" />
                      {processingInvite ? 'Starting...' : 'Start Pre-Call'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}