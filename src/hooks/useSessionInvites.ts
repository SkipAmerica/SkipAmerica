import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { supabase } from '@/integrations/supabase/client'
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

  const handleInvite = useCallback(async (invite: SessionInvite) => {
    // Prevent duplicate processing
    if (processedInvitesRef.current.has(invite.id)) {
      console.log('[SessionInvites] Already processed:', invite.id)
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

    // Mark invite as accepted (type assertion until Supabase types regenerate)
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

  }, [toast])

  useEffect(() => {
    if (!user) return

    // Feature flag check
    if (import.meta.env.VITE_ALMIGHTY_V2 !== 'on') {
      console.log('[SessionInvites] V2 flag disabled, skipping subscription')
      return
    }

    console.log('[SessionInvites:SETUP] 🎧 Initializing subscription', {
      userId: user.id,
      filter: `invitee_id=eq.${user.id}`,
      v2Enabled: import.meta.env.VITE_ALMIGHTY_V2 === 'on',
      timestamp: new Date().toISOString()
    });

    // Subscribe to session_invites for this fan (use invitee_id, not fan_id)
    const channel = supabase
      .channel('session-invites-subscription')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_invites' as any,
          filter: `invitee_id=eq.${user.id}`
        },
        (payload) => {
          const invite = payload.new as SessionInvite
          if (invite.status === 'pending') {
            handleInvite(invite)
          }
        }
      )
      .subscribe((status) => {
        console.log('[SessionInvites] Subscription status:', status)
      })

    channelRef.current = channel

    // Timeout warning if no invite received after 60s
    const timeoutId = setTimeout(() => {
      console.warn('[SessionInvites:TIMEOUT] ⏰ No invite received after 60s', {
        userId: user.id,
        subscriptionStatus: channelRef.current?.state,
        timestamp: new Date().toISOString()
      });
    }, 60000);

    return () => {
      clearTimeout(timeoutId);
      console.log('[SessionInvites] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
  }, [user, handleInvite])

  return null // Hook doesn't return anything, just handles side effects
}
