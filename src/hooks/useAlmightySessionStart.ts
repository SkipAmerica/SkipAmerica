import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/app/providers/auth-provider'
import { useLive } from '@/hooks/live'

interface QueueEntryInput {
  id: string
  fan_id: string
  fan_state?: 'waiting' | 'awaiting_consent' | 'ready' | 'declined' | 'in_call'
  profiles?: {
    full_name?: string
  }
}

interface UseAlmightySessionStartOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useAlmightySessionStart(options?: UseAlmightySessionStartOptions) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { store } = useLive()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const startSession = useCallback(async (queueEntry: QueueEntryInput) => {
    if (!user || isProcessing) return

    const startTimeMs = performance.now();
    setError(null)
    
    // Feature flag check (default ON, can be disabled with 'off')
    const useV2Flow = import.meta.env.VITE_ALMIGHTY_V2 !== 'off'

    if (!useV2Flow) {
      // Legacy flow fallback
      console.warn('[AlmightySessionStart] V2 flag disabled, no legacy implementation')
      toast({
        title: "Feature Not Enabled",
        description: "Almighty sessions are not enabled. Please contact support.",
        variant: "destructive"
      })
      return
    }

    // Client-side validation: Check if fan is ready
    if (queueEntry.fan_state !== 'ready') {
      const stateLabel = {
        'waiting': 'still in queue',
        'awaiting_consent': 'awaiting camera consent',
        'declined': 'declined to join',
        'in_call': 'already in a call',
      }[queueEntry.fan_state || 'waiting'] || 'not ready'

      const errorMsg = `Fan is ${stateLabel}. Please wait for them to enable their camera.`
      
      toast({
        title: "Cannot Start Session",
        description: errorMsg,
        variant: "destructive",
      })
      
      const err = new Error(errorMsg)
      setError(err)
      options?.onError?.(err)
      return
    }
    
    try {
      setIsProcessing(true)

      console.log('[AlmightySessionStart:START]', {
        queueEntryId: queueEntry.id,
        fanId: queueEntry.fan_id,
        fanState: queueEntry.fan_state,
        timestamp: new Date().toISOString()
      })

      // Analytics: session start attempt
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('queue_start_clicked', {
          queueEntryId: queueEntry.id,
          creatorId: user.id,
          fanId: queueEntry.fan_id
        })
      }

      console.log('[AlmightySessionStart:RPC_CALL]', { queueEntryId: queueEntry.id })
      
      // Call atomic RPC to create session
      const { data: sessionId, error: rpcError } = await supabase
        .rpc('start_almighty_session' as any, {
          p_queue_entry: queueEntry.id
        })

      if (rpcError) {
        console.error('[AlmightySessionStart:RPC_ERROR]', {
          error: rpcError,
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details
        })
        
        // Handle fan not ready error specifically
        if (rpcError.message?.includes('fan_not_ready')) {
          throw new Error("Fan hasn't enabled their camera yet. Please wait.")
        }
        
        throw new Error(rpcError.message || 'Failed to create session')
      }

      if (!sessionId) {
        throw new Error('No session ID returned')
      }

      console.log('[AlmightySessionStart:SESSION_CREATED]', { sessionId })

      // Analytics: session created
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('session_created', {
          sessionId,
          queueEntryId: queueEntry.id,
          creatorId: user.id,
          fanId: queueEntry.fan_id
        })
      }

      // Transition FSM to prep state
      store.dispatch({ type: 'ENTER_PREP' })

      // Success toast
      toast({
        title: "Session Starting",
        description: `Connecting with ${queueEntry.profiles?.full_name || 'user'}...`,
      })

      // Call success callback (e.g., close drawer)
      if (options?.onSuccess) {
        options.onSuccess()
      }

      // Set flag to prevent queue cleanup during legitimate session transition
      (window as any).__skipQueueCleanupOnSessionNav = true;

      // Navigate creator to session (replace to prevent back button)
      setTimeout(() => {
        const navStartTime = performance.now();
        console.log('[AlmightySessionStart:NAV_START] 🚀', { 
          sessionId, 
          path: `/session/${sessionId}?role=creator`,
          rpcLatencyMs: navStartTime - startTimeMs,
          timestamp: new Date().toISOString()
        });
        
        // Add navigation completion listener
        window.addEventListener('beforeunload', () => {
          console.log('[AlmightySessionStart:NAV_COMPLETE] ✅ Page unloading for navigation');
        }, { once: true });
        
        window.location.assign(`/session/${sessionId}?role=creator`)
      }, 100)

    } catch (err: any) {
      console.error('[AlmightySessionStart:ERROR]', { 
        error: err,
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      })
      
      const error = err instanceof Error ? err : new Error(err.message || 'Unknown error')
      setError(error)
      
      toast({
        title: "Failed to Start Session",
        description: error.message || "Could not start session. Please try again.",
        variant: "destructive"
      })

      options?.onError?.(error)
    } finally {
      setIsProcessing(false)
    }
  }, [user, isProcessing, store, toast, options])

  return {
    startSession,
    isProcessing,
    error
  }
}
