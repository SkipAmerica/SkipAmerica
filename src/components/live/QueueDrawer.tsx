import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/integrations/supabase/client'
import { useLiveStore } from '@/stores/live-store'
import { useAuth } from '@/app/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Users, Loader2, RefreshCw, Clock, MessageSquare, Wifi, WifiOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import CreatorPreviewWithChat from '@/components/creator/CreatorPreviewWithChat'
import { DraggableBottomPanel } from './DraggableBottomPanel'
import { debounce } from 'lodash'

interface QueueEntry {
  id: string
  fan_id: string
  joined_at: string
  estimated_wait_minutes: number
  discussion_topic?: string
  profile?: {
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

// Simplified panel state
interface PanelState {
  isOpen: boolean
  isDragging: boolean
}

export function QueueDrawer({ isOpen, onClose }: QueueDrawerProps) {
  const store = useLiveStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const creatorId = user?.id

  const [state, setState] = useState<QueueState>({
    entries: [],
    loading: false, 
    error: null,
    retryCount: 0,
    isConnected: true
  })

  const [panelState, setPanelState] = useState<PanelState>({
    isOpen: false,
    isDragging: false
  })

  // Refs for draggable panel
  const panelRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const draggablePanel = useRef<DraggableBottomPanel | null>(null)

  // Initialize draggable panel
  useEffect(() => {
    if (!panelRef.current || !handleRef.current || !isOpen) return
    
    if (!draggablePanel.current) {
      draggablePanel.current = new DraggableBottomPanel({
        openHeightRatio: 0.6,
        minHandleHeight: 140,
        snapThreshold: 0.5
      })
    }
    
    draggablePanel.current.initialize(
      panelRef.current,
      handleRef.current,
      (newState) => {
        setPanelState({
          isOpen: newState.isOpen,
          isDragging: newState.isDragging
        })
      }
    )
    
    return () => {
      if (draggablePanel.current) {
        draggablePanel.current.destroy()
        draggablePanel.current = null
      }
    }
  }, [isOpen, state.entries.length])

  // Panel control functions  
  const togglePanel = useCallback(() => {
    if (draggablePanel.current) {
      draggablePanel.current.toggle()
    }
  }, [])

  const openPanel = useCallback(() => {
    if (draggablePanel.current) {
      draggablePanel.current.open()
    }
  }, [])

  const closePanel = useCallback(() => {
    if (draggablePanel.current) {
      draggablePanel.current.close()
    }
  }, [])

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    if (!creatorId) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log('Fetching queue entries for creator:', creatorId)
      
      // Get queue entries with profiles in one query
      const { data, error } = await supabase
        .from('call_queue')
        .select(`
          id,
          fan_id,
          joined_at,
          estimated_wait_minutes,
          discussion_topic,
          profiles:fan_id (
            full_name,
            avatar_url
          )
        `)
        .eq('creator_id', creatorId)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })

      if (error) throw error

      // Transform data to match expected structure
      const entries = data?.map(entry => ({
        ...entry,
        profile: entry.profiles as any
      })) || []

      setState(prev => ({
        ...prev,
        entries,
        loading: false,
        error: null,
        retryCount: 0,
        isConnected: true
      }))

    } catch (error: any) {
      console.error('Error fetching queue:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load queue',
        retryCount: prev.retryCount + 1,
        isConnected: false
      }))
    }
  }, [creatorId])

  // Real-time subscription to queue changes
  useEffect(() => {
    if (!creatorId) return

    let isMounted = true
    const debouncedFetch = debounce(() => {
      if (isMounted) {
        fetchQueue()
      }
    }, 300)

    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${creatorId}`
        },
        (payload) => {
          console.log('Queue INSERT:', payload)
          debouncedFetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${creatorId}`
        },
        (payload) => {
          console.log('Queue DELETE:', payload)
          debouncedFetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${creatorId}`
        },
        (payload) => {
          console.log('Queue UPDATE:', payload)
          debouncedFetch()
        }
      )
      .subscribe()

    // Initial fetch
    fetchQueue()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
      debouncedFetch.cancel()
    }
  }, [creatorId, fetchQueue])

  // Retry handler
  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }))
    fetchQueue()
  }, [fetchQueue])

  // Utility functions
  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isOpen) return null

  // Render portal content
  const portalContent = (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-semibold">
            Creator Lobby ({state.entries.length})
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (creatorId) {
                supabase
                  .from('call_queue')
                  .delete()
                  .eq('creator_id', creatorId)
                  .eq('status', 'waiting')
                  .then(() => {
                    toast({
                      title: "Queue cleared",
                      description: "All users have been removed from the queue"
                    })
                  })
              }
            }}
            variant="outline"
            size="sm"
          >
            Clear Queue
          </Button>
          
          {state.isConnected ? (
            <Wifi className="w-4 h-4 text-muted-foreground" />
          ) : (
            <WifiOff className="w-4 h-4 text-destructive" />
          )}
          
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Creator Preview */}
      <div className="px-4 py-2 bg-muted/50">
        <CreatorPreviewWithChat creatorId={creatorId || ''} />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Error State */}
        {state.error && (
          <div className="p-4">
            <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <span className="text-destructive">{state.error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={state.loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {state.loading && !state.error && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!state.loading && state.entries.length === 0 && !state.error && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">No one in queue yet</p>
            <p className="text-sm">Fans will appear here when they join</p>
          </div>
        )}

        {/* Unified Draggable Queue Panel */}
        {!state.loading && state.entries.length > 0 && (
          <div
            ref={panelRef}
            className="absolute bottom-0 inset-x-0 z-40 pointer-events-auto bg-background border-t shadow-2xl will-change-transform"
            style={{ height: '60vh' }}
          >
            {/* Primary Call Handle (First in Queue) - Acts as drag handle */}
            {state.entries[0] && (
              <div
                ref={handleRef}
                className="p-4 border-b bg-background cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                style={{ touchAction: 'none' }}
                aria-expanded={panelState.isOpen}
                aria-label="Drag to expand queue or click to toggle"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={state.entries[0].profile?.avatar_url} />
                    <AvatarFallback>
                      {getInitials(state.entries[0].profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-base truncate">
                        {state.entries[0].profile?.full_name || 'Anonymous Fan'}
                      </p>
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        Next
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Ready now</span>
                      </div>
                      
                      {state.entries[0].discussion_topic && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="truncate">{state.entries[0].discussion_topic}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Drag indicator */}
                <div className="flex justify-center mt-3">
                  <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
                </div>
              </div>
            )}
            
            {/* Scrollable Queue List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {state.entries.slice(1).map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={entry.profile?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(entry.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {entry.profile?.full_name || 'Anonymous Fan'}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          #{index + 2}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatWaitTime(entry.estimated_wait_minutes)}</span>
                        </div>
                        
                        {entry.discussion_topic && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{entry.discussion_topic}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(portalContent, document.body)
}