import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SessionInvite {
  id: string
  session_id: string
  invitee_id: string
  creator_name: string
  creator_avatar_url: string | null
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
}

export function useSessionInvites() {
  const { user } = useAuth()
  const { toast } = useToast()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const processedInvitesRef = useRef<Set<string>>(new Set())

  const DEBUG = import.meta.env.VITE_DEBUG_SESSION_INVITES === 'true'
  const V2 = import.meta.env.VITE_ALMIGHTY_V2 === 'on'

  // Stable handler to avoid effect churn
  const handleInvite = useCallback(async (invite: SessionInvite) => {
    // Prevent duplicate processing
    if (processedInvitesRef.current.has(invite.id)) {
      DEBUG && console.log('[SessionInvites] Already processed:', invite.id)
      return
    }
    processedInvitesRef.current.add(invite.id)

    console.log('[SessionInvites] Received invite:', invite)

    // Analytics breadcrumb
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('fan_invite_received', {
        sessionId: invite.session_id,
        inviteId: invite.id,
        creatorName: invite.creator_name
      })
    }

    // Show notification
    toast({
      title: `${invite.creator_name} is ready!`,
      description: "You're next in line. Connecting now...",
      duration: 3000,
    })

    // Browser notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${invite.creator_name} is ready!`, {
        body: "You're next in line. Connecting now...",
        icon: invite.creator_avatar_url || undefined,
      })
    }

    // Mark invite as accepted
    await supabase
      .from('session_invites' as any)
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    // Analytics breadcrumb
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('invite_accepted', {
        sessionId: invite.session_id,
        inviteId: invite.id
      })
    }

    // Navigate function
    const go = () => {
      console.log('[SessionInvites] Navigating to session:', invite.session_id)
      
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('fan_navigating', {
          sessionId: invite.session_id
        })
      }
      
      // Set global flag to prevent JoinQueue cleanup on navigation
      ;(window as any).__skipQueueCleanupOnSessionNav = true
      
      window.location.replace(`/session/${invite.session_id}?role=user`)
    }

    // Visibility-aware navigation (defer if tab is hidden)
    if (document.visibilityState === 'hidden') {
      console.log('[SessionInvites] Tab hidden, deferring navigation')
      const onVis = () => {
        if (document.visibilityState === 'visible') {
          console.log('[SessionInvites] Tab visible, navigating now')
          document.removeEventListener('visibilitychange', onVis)
          go()
        }
      }
      document.addEventListener('visibilitychange', onVis)
    } else {
      // Immediate navigation with slight delay for toast
      setTimeout(go, 1200)
    }

  }, [toast, DEBUG])

  useEffect(() => {
    if (!user) return

    // Feature flag check
    if (!V2) {
      DEBUG && console.log('[SessionInvites] V2 flag disabled, skipping subscription')
      return
    }

    // Tear down any prior channel for this hook instance
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current)
      } catch (e) {
        console.error('[SessionInvites] Channel cleanup error:', e)
      }
      channelRef.current = null
    }

    const filter = `invitee_id=eq.${user.id}`

    console.log('[SessionInvites:SETUP] 🎧 Initializing subscription', {
      userId: user.id,
      userEmail: user.email,
      filter,
      v2Enabled: V2,
      timestamp: new Date().toISOString()
    });

    // Subscribe to session_invites for this fan
    const channel = supabase
      .channel('session-invites-subscription')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_invites' as any,
          filter
        },
        (payload) => {
          DEBUG && console.log('[SessionInvites:RAW_EVENT] 🔔 Received realtime event:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            timestamp: new Date().toISOString()
          })
          const invite = payload.new as SessionInvite
          if (invite.status === 'pending') {
            handleInvite(invite)
          }
        }
      )
      .subscribe((status, err) => {
        DEBUG && console.log('[SessionInvites:SUBSCRIPTION]', {
          status,
          error: err,
          channelState: channel.state,
          timestamp: new Date().toISOString()
        })
        
        if (status === 'SUBSCRIBED') {
          console.log('[SessionInvites] ✅ Subscription active and listening')
          
          // Cold-start: Check for any pending invites created before subscription
          supabase
            .from('session_invites' as any)
            .select('*')
            .eq('invitee_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
              if (error) {
                console.error('[SessionInvites:COLD_START] Error checking pending invites:', error)
                return
              }
              
              if (data && data.length > 0) {
                DEBUG && console.log('[SessionInvites:COLD_START] Found pending invite, processing:', data[0])
                const invite = data[0] as unknown as SessionInvite
                handleInvite(invite)
              } else {
                DEBUG && console.log('[SessionInvites:COLD_START] No pending invites found')
              }
            })
        }
        
        if (status === 'CHANNEL_ERROR') {
          console.error('[SessionInvites] ❌ Channel error:', err)
        }
      })

    channelRef.current = channel

    return () => {
      DEBUG && console.log('[SessionInvites] Cleaning up subscription');
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (e) {
          console.error('[SessionInvites] Cleanup error:', e)
        }
        channelRef.current = null
      }
    }
  }, [user?.id, handleInvite, V2, DEBUG])

  return null // Hook doesn't return anything, just handles side effects
}
