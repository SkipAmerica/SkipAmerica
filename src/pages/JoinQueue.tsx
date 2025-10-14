import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { isConsentRisingEdgeFixEnabled } from '@/lib/env';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { QueueService } from '@/services/queue-service';
import { BroadcastViewer } from '@/components/queue/BroadcastViewer';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';
import { useCreatorPresence } from '@/shared/hooks';
import { QueueChat } from '@/components/queue/QueueChat';
import { NextUpConsentModal } from '@/components/queue/NextUpConsentModal';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { useSessionInvites } from '@/hooks/useSessionInvites';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const displayNameSchema = z.string()
  .trim()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[^\x00-\x1F\x7F]+$/, 'Name contains invalid characters');

interface Creator {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  category?: string;
  rating?: number;
}

interface LiveSession {
  id: string;
  creator_id: string;
  started_at: string;
}

interface QueueStatusResponse {
  in_queue: boolean;
  position: number | null;
  is_front: boolean;
  total: number;
  needs_consent: boolean;
  entry?: {
    id: string;
    fan_state: string;
    fan_has_consented: boolean;
    discussion_topic: string | null;
    joined_at: string;
  };
}

export default function JoinQueue() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signInAnonymously } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  // URL flag to force broadcasting for testing (bypass consent)
  const forceBroadcast = new URLSearchParams(window.location.search).get('broadcast') === '1';
  
  // Use centralized presence hook for online status
  const { isOnline } = useCreatorPresence(creatorId || null);

  // Enable session invite listening for fans in queue
  useSessionInvites();

  // Inline invite listener with initial fetch fallback
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) {
      console.log('[JoinQueue:INVITE_LISTENER] ❌ No user ID, skipping');
      return;
    }
    
    console.log('[JoinQueue:INVITE_LISTENER] 🎧 Starting for user:', user.id);

    const goto = (sessionId: string, source: string) => {
      if (navigatedRef.current) {
        console.log('[JoinQueue:INVITE_NAV] ⚠️ Already navigated, skipping');
        return;
      }
      navigatedRef.current = true;
      
      // Set flag to prevent queue cleanup on navigation
      (window as any).__skipQueueCleanupOnSessionNav = true;
      
      console.log(`[JoinQueue:INVITE_NAV] 🚀 Navigating via ${source} to:`, sessionId);
      window.location.href = `/session/${sessionId}?role=user`;
    };

    // Initial fetch fallback - catch invites created before page load
    (async () => {
      const { data: pending, error } = await supabase
        .from('session_invites')
        .select('id, session_id, status, creator_name, created_at')
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[JoinQueue:INVITE_FETCH] ❌ Error:', error);
      } else if (pending && pending[0]) {
        console.log('[JoinQueue:INVITE_FETCH] ✅ Found pending invite:', pending[0]);
        toast({
          title: `${pending[0].creator_name || 'Creator'} is ready!`,
          description: "Connecting to session...",
          duration: 2000,
        });
        goto(pending[0].session_id, 'INITIAL_FETCH');
        return; // Skip realtime setup since we're navigating
      } else {
        console.log('[JoinQueue:INVITE_FETCH] No pending invites found');
      }

      // Realtime listener - catch invites created after page load
      const inviteChannel = supabase
        .channel(`invites:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_invites',
          filter: `invitee_id=eq.${user.id}`
        }, (payload) => {
          console.log('[JoinQueue:INVITE_EVENT] 📨 Received:', {
            timestamp: new Date().toISOString(),
            invite: payload.new
          });
          
          const invite = payload.new as any;
          
          toast({
            title: `${invite.creator_name || 'Creator'} is ready!`,
            description: "Connecting to session...",
            duration: 2000,
          });
          
          goto(invite.session_id, 'REALTIME');
        })
        .subscribe((status, err) => {
          console.log('[JoinQueue:REALTIME:STATUS:INVITES] 📡', { 
            timestamp: new Date().toISOString(),
            status, 
            error: err,
            userId: user.id
          });
          
          if (err) {
            console.error('[JoinQueue:REALTIME:ERROR:INVITES] ❌', err);
          }
        });

      return () => { 
        console.log('[JoinQueue:INVITE_LISTENER] 🧹 Cleaning up');
        try {
          supabase.removeChannel(inviteChannel);
        } catch (e) {
          console.error('[JoinQueue:INVITE_LISTENER] Cleanup error:', e);
        }
      };
    })();
  }, [user?.id, toast]);

  const [creator, setCreator] = useState<Creator | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsentedToBroadcast, setHasConsentedToBroadcast] = useState(false);
  const [actualPosition, setActualPosition] = useState<number | null>(null);
  const [consentStream, setConsentStream] = useState<MediaStream | undefined>(undefined);
  const [queueEntryId, setQueueEntryId] = useState<string | null>(null);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  const isUnloadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const userEditedNameRef = useRef(false);
  const initialNameSetRef = useRef(false);
  const consentResolvedRef = useRef(false); // Prevents modal from reopening after consent flow starts
  const wasFrontRef = useRef(false); // Rising-edge detector for position #1
  const prevPositionRef = useRef<number | null>(null); // Track prev position for rising-edge
  const checkingLiveStatusRef = useRef(false); // Prevent concurrent checkLiveStatus calls
  const prevEntryIdRef = useRef<string | null>(null); // Track previous entry ID for comparison

  // Ensure full-viewport scrolling on PQ
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById('root');

    htmlEl.classList.add('pq-scroll');
    bodyEl.classList.add('pq-scroll');
    rootEl?.classList.add('pq-scroll-root');

    // Mark scroll container for hooks that look it up
    bodyEl.setAttribute('data-scroll-container', 'true');

    return () => {
      htmlEl.classList.remove('pq-scroll');
      bodyEl.classList.remove('pq-scroll');
      rootEl?.classList.remove('pq-scroll-root');
      bodyEl.removeAttribute('data-scroll-container');
    };
  }, []);

  // Stable cleanup function using useCallback
  const cleanupQueue = useCallback(async (reason: string = 'unknown') => {
    if (!user || !creatorId || !isInQueue || isUnloadingRef.current) return;
    
    console.log(`[JoinQueue] Cleanup triggered - reason: ${reason}`);
    
    try {
      await supabase
        .from('call_queue')
        .delete()
        .eq('creator_id', creatorId)
        .eq('fan_id', user.id);
      console.log('[JoinQueue] Queue cleanup completed for reason:', reason);
    } catch (error) {
      console.error('[JoinQueue] Error during queue cleanup:', error);
    }
  }, [user, creatorId, isInQueue]);

  // Auto-login anonymous user if not authenticated
  useEffect(() => {
    if (authLoading || autoLoginAttempted) return;

    if (!user) {
      setAutoLoginAttempted(true);
      setAutoLoginLoading(true);
      
      signInAnonymously()
        .then(({ error }) => {
          if (error) {
            console.error('Auto-login failed:', error);
            toast({
              title: "Connection Error",
              description: "Unable to connect to the service. Please refresh and try again.",
              variant: "destructive",
            });
          }
        })
        .finally(() => {
          setAutoLoginLoading(false);
        });
    }
  }, [user, authLoading, autoLoginAttempted, signInAnonymously, toast]);

  // Fetch creator info
  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;
      
      // Wait for auth to complete before fetching creator (RLS requires auth)
      if (authLoading || autoLoginLoading) {
        console.log('[JoinQueue] Waiting for authentication before fetching creator...');
        return;
      }
      
      if (!user) {
        console.error('[JoinQueue] No user after auth - cannot fetch creator');
        return;
      }

      try {
        console.log('[JoinQueue] Looking up creator:', creatorId);
        
        // Query creators table directly (creators.id references profiles.id)
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select(`
            id,
            full_name,
            bio,
            avatar_url,
            categories,
            base_rate_min,
            is_online
          `)
          .eq('id', creatorId)
          .maybeSingle();

        if (creatorError) {
          console.error('[JoinQueue] Creator query error:', creatorError);
          throw creatorError;
        }

        if (!creatorData) {
          console.warn('[JoinQueue] Creator not found');
          toast({
            title: "Creator not found",
            description: "The creator you're looking for doesn't exist or may have been removed.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Handle avatar 406 errors gracefully - use fallback avatar immediately
        let avatarUrl = creatorData.avatar_url;
        if (avatarUrl) {
          try {
            const response = await fetch(avatarUrl, { method: 'HEAD' });
            if (response.status === 406 || !response.ok) {
              console.warn('[JoinQueue] Avatar fetch failed (406 or other error), using fallback');
              avatarUrl = undefined;
            }
          } catch (error) {
            console.warn('[JoinQueue] Avatar fetch error, using fallback:', error);
            avatarUrl = undefined;
          }
        }

        setCreator({
          id: creatorData.id,
          full_name: creatorData.full_name,
          bio: creatorData.bio || 'Creator Profile',
          avatar_url: avatarUrl,
          category: creatorData.categories?.[0] || 'General',
          rating: undefined // Will be calculated from appointments/reviews later
        });

        // Note: Online status now managed by useCreatorPresence hook

      } catch (error) {
        console.error('[JoinQueue] Error fetching creator:', error);
        toast({
          title: "Error",
          description: "Failed to load creator information. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [creatorId, authLoading, autoLoginLoading, user, toast, navigate]);

  // Check if creator is live and get queue status
  const checkLiveStatus = useCallback(async () => {
    if (!creatorId || !user) return;
    
    // Prevent concurrent calls (circuit breaker)
    if (checkingLiveStatusRef.current) {
      console.log('[JoinQueue] ⚠️ checkLiveStatus already in progress, skipping');
      return;
    }
    
    checkingLiveStatusRef.current = true;
    
    try {
      // Check if creator is currently live
      const { data: session } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('creator_id', creatorId)
        .is('ended_at', null)
        .single();

      setLiveSession(session);

      // Get atomic queue position from database (single source of truth)
      const { data: queueStatus, error } = await supabase.rpc('get_queue_position', {
        p_creator_id: creatorId,
        p_fan_id: user.id
      }) as { data: QueueStatusResponse | null; error: any };

      if (error) {
        console.error('[JoinQueue] Error fetching queue position:', error);
        return;
      }

      if (!queueStatus) {
        console.warn('[JoinQueue] No queue status returned');
        return;
      }

      // Reset consent ref when entering queue for first time or re-entering
      const currentEntryId = queueStatus.entry?.id;
      const hasNewEntry = currentEntryId && currentEntryId !== prevEntryIdRef.current;
      
      if (hasNewEntry) {
        console.log('[JoinQueue] 🔄 New queue entry detected', {
          previousEntryId: prevEntryIdRef.current,
          newEntryId: currentEntryId,
          changed: prevEntryIdRef.current !== currentEntryId
        });
        prevEntryIdRef.current = currentEntryId;
        consentResolvedRef.current = false;
      }

      // Detect new queue session using ref-based comparison (prevents stale closure)
      const isNewQueueSession = queueStatus.in_queue && hasNewEntry;
      
      // Force synchronous batching of ALL state updates to prevent flutter
      flushSync(() => {
        if (isNewQueueSession) {
          console.log('[JoinQueue] New queue session detected, resetting consent state');
          setQueueEntryId(queueStatus.entry!.id);
          setHasConsentedToBroadcast(false);
          consentResolvedRef.current = false;
          setDiscussionTopic(queueStatus.entry!.discussion_topic || '');
        } else if (queueStatus.in_queue && queueStatus.entry) {
          // Same session - restore consent from database if already consented
          setQueueEntryId(queueStatus.entry.id);
          setDiscussionTopic(queueStatus.entry.discussion_topic || '');
          
          // Only update consent state from DB if user hasn't made a local decision
          if (!consentResolvedRef.current) {
            if (queueStatus.entry.fan_has_consented && !hasConsentedToBroadcast) {
              console.log('[JoinQueue] Restoring consent state from database');
              setHasConsentedToBroadcast(true);
              consentResolvedRef.current = true;
            }
          }
        } else {
          setQueueEntryId(null);
          setDiscussionTopic('');
        }

        // Update queue state in same flush
        setIsInQueue(queueStatus.in_queue);
        setQueueCount(queueStatus.total);
        setActualPosition(queueStatus.position);
      });

      const isFront = queueStatus.is_front;
      console.log('[JoinQueue:QUEUE_STATUS] 📊', {
        timestamp: new Date().toISOString(),
        in_queue: queueStatus.in_queue,
        position: queueStatus.position,
        is_front: isFront,
        total: queueStatus.total,
        fan_state: queueStatus.entry?.fan_state,
        fan_has_consented: queueStatus.entry?.fan_has_consented,
        needs_consent: queueStatus.needs_consent,
        entry_id: queueStatus.entry?.id,
        changed_from: {
          was_in_queue: isInQueue,
          was_position: actualPosition,
          was_entry_id: queueEntryId
        }
      });

      wasFrontRef.current = isFront;

      // Close modal if user drops from position 1
      if (isConsentRisingEdgeFixEnabled() && prevPositionRef.current === 1 && actualPosition !== 1) {
        console.log('[JoinQueue] ⬇ Left position 1, closing consent modal');
        setShowConsentModal(false);
      }
    } catch (error) {
      console.error('[JoinQueue] Error in checkLiveStatus:', error);
    } finally {
      checkingLiveStatusRef.current = false;
    }
  }, [creatorId, user]);

  // Dev-only debug object for real-time state inspection
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__queueDebug = {
        creatorId,
        userId: user?.id,
        isInQueue,
        actualPosition,
        queueEntryId,
        hasConsentedToBroadcast,
        liveSession,
        refreshStatus: checkLiveStatus
      };
    }
  }, [creatorId, user?.id, isInQueue, actualPosition, queueEntryId, hasConsentedToBroadcast, liveSession, checkLiveStatus]);

  // Subscribe to live status and queue changes with debounce
  useEffect(() => {
    console.log('[JoinQueue:SUBSCRIPTION_MOUNT] 🔍 Checking mount conditions:', {
      hasUser: !!user,
      hasCreatorId: !!creatorId,
      loading,
      userId: user?.id,
      creatorId
    });

    if (!creatorId || !user) {
      console.log('[JoinQueue:SUBSCRIPTION_MOUNT] ❌ Early return - missing deps');
      return;
    }

    console.log('[JoinQueue:SUBSCRIPTION_MOUNT] ✅ Proceeding with queue/live subscriptions');

    checkLiveStatus();

    // Debounce checkLiveStatus to reduce database load
    let debounceTimer: NodeJS.Timeout;
    const debouncedCheck = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkLiveStatus, 300);
    };

    // Subscribe to queue changes with DELETE handler for state reset
    const queueChannel = supabase
      .channel(`queue-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_queue',
          filter: `fan_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[JoinQueue:REALTIME:UPDATE] 🔔', {
            timestamp: new Date().toISOString(),
            old: payload.old,
            new: payload.new,
            eventType: payload.eventType
          });
          debouncedCheck();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'call_queue',
          filter: `fan_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[JoinQueue:REALTIME:DELETE] 🔔', {
            timestamp: new Date().toISOString(),
            payload
          });
          
          // Reset ALL queue-related state
          setIsInQueue(false);
          setActualPosition(null);
          setQueueEntryId(null);
          setHasConsentedToBroadcast(false);
          consentResolvedRef.current = false;
          wasFrontRef.current = false;
          setShowConsentModal(false);
          
          checkLiveStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${creatorId}`
        },
        debouncedCheck
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${creatorId}`
        },
        debouncedCheck
      )
      .subscribe((status, err) => {
        console.log('[JoinQueue:REALTIME:STATUS:QUEUE] 📡', {
          timestamp: new Date().toISOString(),
          status,
          error: err,
          creatorId,
          userId: user.id,
          channel: 'call_queue'
        });
        
        if (err) {
          console.error('[JoinQueue:REALTIME:ERROR:QUEUE] ❌', err);
        }
      });

    // Subscribe to live session changes
    const liveChannel = supabase
      .channel(`live-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `creator_id=eq.${creatorId}`
        },
        debouncedCheck
      )
      .subscribe((status, err) => {
        console.log('[JoinQueue:REALTIME:STATUS:LIVE] 📡', {
          timestamp: new Date().toISOString(),
          status,
          error: err,
          creatorId,
          channel: 'live_sessions'
        });
        
        if (err) {
          console.error('[JoinQueue:REALTIME:ERROR:LIVE] ❌', err);
        }
      });

    // Note: Presence subscription now handled by useCreatorPresence hook

    return () => {
      clearTimeout(debounceTimer);
      if ((window as any).__allow_ch_teardown) {
        try { supabase.removeChannel(queueChannel); } catch {}
        try { supabase.removeChannel(liveChannel); } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
    };
  }, [creatorId, user, checkLiveStatus]);

  // Listen for queue front changes to trigger consent check
  useEffect(() => {
    if (!creatorId) return;

    const onFrontChanged = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev.detail?.creatorId !== creatorId) return;
      
      console.log('[JoinQueue] Queue front changed, refetching status');
      checkLiveStatus();
    };
    
    window.addEventListener('queue:front-changed', onFrontChanged as EventListener);
    return () => window.removeEventListener('queue:front-changed', onFrontChanged as EventListener);
  }, [creatorId, checkLiveStatus]);

  // Heartbeat for positions 1-2: Poll every 10 seconds as fallback for missed realtime events
  useEffect(() => {
    if (!creatorId || !user || !isInQueue || actualPosition === null || actualPosition > 2) return;
    
    console.log('[JoinQueue] Setting up heartbeat for position', actualPosition);
    const heartbeatInterval = setInterval(() => {
      console.log('[JoinQueue:HEARTBEAT] 💓', {
        timestamp: new Date().toISOString(),
        queueEntryId,
        isInQueue,
        position: actualPosition,
        fan_state: 'polling...'
      });
      checkLiveStatus();
    }, 10000); // 10 seconds
    
    return () => clearInterval(heartbeatInterval);
  }, [creatorId, user, isInQueue, actualPosition, checkLiveStatus]);

  // Listen for session invites (log when listener is active)
  useEffect(() => {
    if (user && isInQueue) {
      console.log('[JoinQueue:INVITE_LISTENER] 👂 Active and waiting for session invite', {
        userId: user.id,
        isInQueue,
        queueEntryId,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, isInQueue, queueEntryId]);

  // Log position changes for debugging + cleanup when leaving position 1
  useEffect(() => {
    if (actualPosition !== null) {
      console.log('[JoinQueue:POSITION_CHANGED] 📍', {
        timestamp: new Date().toISOString(),
        position: actualPosition,
        previous: prevPositionRef.current
      });
      
      // When user left position 1, reset consent modal state for next time
      if (prevPositionRef.current === 1 && actualPosition !== 1) {
        console.log('[JoinQueue] ⬇️ Left position 1, resetting consent modal state');
        setShowConsentModal(false);
        prevPositionRef.current = actualPosition;
      }
    }
  }, [actualPosition]);

  // Consent modal trigger: Show when user reaches position 1 and hasn't consented
  useEffect(() => {
    const RISING_EDGE_FIX = isConsentRisingEdgeFixEnabled();
    
    // Rising-edge detection (only if flag enabled)
    const prev = prevPositionRef.current;
    const risingToOne = prev !== 1 && actualPosition === 1;
    
    // Don't show modal if:
    // - Not in queue
    // - Not at position 1
    // - No queue entry ID (mid-fetch state)
    // - Already consented
    // - Force broadcast enabled
    // - Consent already resolved
    // - Modal is already open (prevents reopening)
    // - (NEW) Not a rising edge to position 1 (when flag enabled)
    if (
      !isInQueue ||
      actualPosition !== 1 ||
      !queueEntryId ||
      hasConsentedToBroadcast ||
      forceBroadcast ||
      consentResolvedRef.current ||
      showConsentModal ||
      (RISING_EDGE_FIX && !risingToOne)
    ) {
      // Log WHY we're not showing the modal (only when at position 1 for debugging)
      if (actualPosition === 1 && isInQueue) {
        console.log('[JoinQueue] ❌ NOT showing consent modal:', {
          isInQueue,
          actualPosition,
          queueEntryId: !!queueEntryId,
          hasConsentedToBroadcast,
          forceBroadcast,
          consentResolved: consentResolvedRef.current,
          showConsentModal,
          RISING_EDGE_FIX,
          risingToOne,
          prev
        });
      }
      return;
    }

    console.log('[JoinQueue] 🎯 Consent modal open:', {
      prev,
      pos: actualPosition,
      queueEntryId,
      localConsent: hasConsentedToBroadcast,
      consentResolved: consentResolvedRef.current,
      showModal: showConsentModal
    });
    setShowConsentModal(true);
    // Don't update prevPositionRef yet - wait for modal to be dismissed
  }, [actualPosition, isInQueue, hasConsentedToBroadcast, forceBroadcast, showConsentModal, queueEntryId]);

  // Set initial display name from profile (only once, and never overwrite user edits)
  useEffect(() => {
    if (initialNameSetRef.current || userEditedNameRef.current || !profile) return;
    
    // For anonymous users or users with "Anonymous Guest" as name, leave blank for them to fill
    if (profile.full_name && profile.full_name !== 'Anonymous Guest') {
      setDisplayName(profile.full_name);
    }
    initialNameSetRef.current = true;
  }, [profile]);

  // Browser event cleanup and heartbeat system
  useEffect(() => {
    if (!user || !creatorId || !isInQueue) return;

    console.log('[JoinQueue] Setting up heartbeat and cleanup for user:', user.id, 'creator:', creatorId);

    // Heartbeat to update last_seen timestamp every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      try {
        const { error } = await supabase
          .from('call_queue')
          .update({ last_seen: new Date().toISOString() })
          .eq('creator_id', creatorId)
          .eq('fan_id', user.id);
        
        if (error) {
          console.error('[JoinQueue] Heartbeat update failed:', error);
        } else {
          console.log('[JoinQueue] Heartbeat updated successfully');
        }
      } catch (error) {
        console.error('[JoinQueue] Heartbeat update failed:', error);
      }
    }, 30000); // 30 seconds

    // Only cleanup on actual page unload, not tab switching
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Skip cleanup if navigating to session (invite accepted)
      if ((window as any).__skipQueueCleanupOnSessionNav) {
        console.log('[JoinQueue] beforeunload - skipping cleanup (session navigation)');
        return;
      }
      
      console.log('[JoinQueue] beforeunload - cleaning up queue');
      isUnloadingRef.current = true;
      
      // Use sendBeacon for reliable cleanup on page unload
      if (navigator.sendBeacon) {
        const payload = JSON.stringify({
          creator_id: creatorId,
          fan_id: user.id
        });
        navigator.sendBeacon('/api/cleanup-queue', payload);
      } else {
        // Synchronous cleanup for browsers without sendBeacon
        cleanupQueue('beforeunload');
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on effect teardown (NOT component unmount)
    return () => {
      console.log('[JoinQueue] Effect cleanup - clearing timers and listeners only');
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up consent stream tracks
      if (consentStream) {
        console.log('[JoinQueue] Stopping consent stream tracks');
        consentStream.getTracks().forEach(track => track.stop());
      }
      // NOTE: Do NOT call cleanupQueue here - it fires when consentStream changes
    };
  }, [user, creatorId, isInQueue]); // Removed consentStream from deps

  // Separate unmount-only cleanup using refs
  useEffect(() => {
    const userIdRef = { current: user?.id };
    const creatorIdRef = { current: creatorId };
    const isInQueueRef = { current: isInQueue };

    // Update refs on every render
    userIdRef.current = user?.id;
    creatorIdRef.current = creatorId;
    isInQueueRef.current = isInQueue;

    // This cleanup only runs on true component unmount
    return () => {
      console.log('[JoinQueue] Component unmount - final cleanup check');
      // Only cleanup if not already unloading and still in queue
      if (!isUnloadingRef.current && isInQueueRef.current && userIdRef.current && creatorIdRef.current) {
        console.log('[JoinQueue] Component unmount - removing from queue');
        cleanupQueue('component-unmount-final');
      }
    };
  }, []); // Empty deps = runs cleanup only on unmount

  const handleJoinQueue = async () => {
    if (!user || !creatorId || !displayName.trim()) return;

    // Validate display name
    const validation = displayNameSchema.safeParse(displayName);
    if (!validation.success) {
      toast({
        title: "Invalid name",
        description: validation.error.issues[0].message,
        variant: "destructive"
      });
      return;
    }

    setJoining(true);
    console.log('[JoinQueue] Attempting to join queue for creator:', creatorId, 'user:', user.id);
    
    try {
      // Update profile name first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: displayName.trim() })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Join the queue
      const { error } = await supabase
        .from('call_queue')
        .insert({
          creator_id: creatorId,
          fan_id: user.id,
          discussion_topic: discussionTopic || null,
          priority: 0, // FCFS - no priority jumps
          status: 'waiting'
        });

      if (error) {
        if (error.code === '23505') {
          console.log('[JoinQueue] User already in queue');
          toast({
            title: "Already in queue",
            description: "You're already in this creator's queue.",
          });
          setIsInQueue(true); // Update state to reflect reality
        } else {
          throw error;
        }
      } else {
        console.log('[JoinQueue] Successfully joined queue');
        setIsInQueue(true);
        checkLiveStatus();
      // Refresh queue status to get accurate position
      await checkLiveStatus();
      
      toast({
        title: "Joined queue!",
        description: actualPosition === 1 ? "You're next up." : `You're in queue at position ${actualPosition || 'calculating...'}.`,
      });
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      toast({
        title: "Error",
        description: "Failed to join queue. Please try again.",
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user || !creatorId) return;

    console.log('[JoinQueue] User manually leaving queue');
    
    try {
      await QueueService.removeFromQueue({
        creatorId,
        fanId: user.id,
        reason: 'manual_leave',
      });

      // Reset ALL queue state atomically
      setIsInQueue(false);
      setDiscussionTopic('');
      setQueueEntryId(null);
      setHasConsentedToBroadcast(false);
      setActualPosition(null);
      consentResolvedRef.current = false;
      wasFrontRef.current = false;
      
      // Clean up consent stream
      if (consentStream) {
        consentStream.getTracks().forEach(track => track.stop());
        setConsentStream(undefined);
      }
      
      console.log('[JoinQueue] Successfully left queue');
      toast({
        title: "Left queue",
        description: "You've been removed from the queue.",
      });
    } catch (error) {
      console.error('[JoinQueue] Error leaving queue:', error);
      toast({
        title: "Error",
        description: "Failed to leave queue. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleConsentAgree = async (stream: MediaStream) => {
    console.log('[JoinQueue] 🎬 handleConsentAgree called with stream:', {
      streamId: stream.id,
      tracks: stream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled }))
    });
    
    // Store the stream immediately
    setConsentStream(stream);
    
    // Pre-flight validation
    if (!user?.id) {
      console.error('[JoinQueue] ❌ No user ID');
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!creatorId) {
      console.error('[JoinQueue] ❌ No creatorId');
      toast({
        title: "Invalid Creator",
        description: "Creator information is missing. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    if (!queueEntryId) {
      console.error('[JoinQueue] ❌ No queueEntryId');
      toast({
        title: "Queue Entry Not Found",
        description: "Please rejoin the queue to continue.",
        variant: "destructive"
      });
      setShowConsentModal(false);
      return;
    }

    console.log('[JoinQueue] ✅ Pre-flight checks passed', { 
      userId: user.id, 
      creatorId, 
      queueEntryId 
    });
    
    // Optimistically resolve consent to prevent modal from reopening
    consentResolvedRef.current = true;
    const prevConsent = hasConsentedToBroadcast;
    setHasConsentedToBroadcast(true);

    // Optimistically close modal to prevent reopen flicker
    if (isConsentRisingEdgeFixEnabled()) {
      console.log('[JoinQueue] ✓ Consent modal close (optimistic):', {
        queueEntryId,
        localConsent: true,
        consentResolved: true
      });
      setShowConsentModal(false);
    }

    setIsUpdatingConsent(true);

    // Timeout guard (15 seconds)
    const timeoutId = setTimeout(() => {
      console.error('[JoinQueue] Consent update timed out');
      toast({
        title: "Request Timed Out",
        description: "The update took too long. Check your connection and try again.",
        variant: "destructive"
      });
      setIsUpdatingConsent(false);
    }, 15000);

    try {
      // Update queue state to 'ready'
      const { data, error } = await supabase
        .from('call_queue')
        .update({
          fan_state: 'ready',
          fan_has_consented: true,
          fan_camera_ready: true,
          fan_preview_updated_at: new Date().toISOString(),
        })
        .eq('id', queueEntryId)
        .select();

      clearTimeout(timeoutId);

      if (error) {
        console.error('[JoinQueue] Failed to update readiness:', error);
        
        // Rollback optimistic update
        consentResolvedRef.current = false;
        setHasConsentedToBroadcast(prevConsent);
        if (isConsentRisingEdgeFixEnabled()) {
          setShowConsentModal(true); // Reopen on failure
        }
        
        // Specific error messages based on error code
        if (error.code === 'PGRST116' || error.code === '42501') {
          toast({
            title: "Unauthorized",
            description: "You're not allowed to update queue state. Please refresh or rejoin.",
            variant: "destructive"
          });
        } else if (error.code === '23503') {
          toast({
            title: "Queue Entry Invalid",
            description: "Your queue entry no longer exists. Please rejoin.",
            variant: "destructive"
          });
          setShowConsentModal(false);
          setIsInQueue(false);
        } else {
          toast({
            title: "Update Failed",
            description: error.message || "Failed to activate video preview. Please try again.",
            variant: "destructive"
          });
        }
        return;
      }

      // Check if row was actually updated
      if (!data || data.length === 0) {
        console.warn('[JoinQueue] No rows updated - queue entry may have changed');
        
        // Rollback optimistic update
        consentResolvedRef.current = false;
        setHasConsentedToBroadcast(prevConsent);
        if (isConsentRisingEdgeFixEnabled()) {
          setShowConsentModal(true); // Reopen on failure
        }
        
        toast({
          title: "Queue Status Changed",
          description: "Your spot in the queue has changed. Please rejoin.",
          variant: "destructive"
        });
        setShowConsentModal(false);
        setIsInQueue(false);
        return;
      }

      // Success - consent already set optimistically above
      console.log('[JoinQueue] ✅ Consent granted successfully');
      console.log('[JoinQueue] 📊 Publishing details:', {
        fanId: user.id,
        creatorId,
        roomName: `lobby_${creatorId}`,
        hasConsentedToBroadcast: true,
        consentStream: !!consentStream
      });
      
      toast({
        title: "Ready to connect",
        description: `${creator?.full_name || 'The creator'} will call you when ready`,
      });
      
      // Close the modal after successful consent
      setShowConsentModal(false);
      prevPositionRef.current = actualPosition; // Update ref after modal closes

    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[JoinQueue] Failed to update queue state:', err);
      
      // Rollback optimistic update
      consentResolvedRef.current = false;
      setHasConsentedToBroadcast(prevConsent);
      
      toast({
        title: "Error",
        description: "We couldn't save your status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingConsent(false); // Always reset loading state
    }
  };

  // Log state changes for debugging
  useEffect(() => {
    console.log('[JoinQueue] 📊 State change:', {
      shouldPublishFanVideo: isInQueue && (hasConsentedToBroadcast || forceBroadcast),
      hasConsentedToBroadcast,
      forceBroadcast,
      isInQueue,
      hasConsentStream: !!consentStream,
      consentStreamTracks: consentStream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      }))
    });
  }, [isInQueue, hasConsentedToBroadcast, forceBroadcast, consentStream]);

  const handleConsentDecline = async () => {
    console.log('[JoinQueue] User declined consent - leaving queue');

    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to leave the queue? You'll lose your spot in line."
    );

    if (!confirmed) {
      return;
    }

    // Update queue state to 'declined' before leaving
    if (queueEntryId) {
      await supabase
        .from('call_queue')
        .update({ fan_state: 'declined' })
        .eq('id', queueEntryId);
    }

    // Clean up consent stream
    if (consentStream) {
      consentStream.getTracks().forEach(track => track.stop());
      setConsentStream(undefined);
    }

    // Update ref before leaving since consent is resolved
    prevPositionRef.current = actualPosition;

    // Leave queue (triggers existing cleanup logic)
    await handleLeaveQueue();
  };

  if (authLoading || autoLoginLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">
            {autoLoginLoading ? 'Setting up your session...' : 'Loading creator information...'}
          </p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p>Creator not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (liveSession) {
      return <Badge variant="default" className="bg-red-500">🔴 Live Broadcasting</Badge>;
    }
    return <Badge variant="secondary">Offline</Badge>;
  };

  // Calculate estimated wait time (4 minutes per person)
  const calculateWaitTime = (position: number | null): string => {
    if (!position || position <= 1) return '0';
    const minutes = position * 4;
    return `${minutes}`;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-safe-bottom ios-safe-left ios-safe-right pb-20">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Creator info header - Mobile optimized */}
        <div className="mb-3">
          <div className={cn(
            "flex items-center gap-3 bg-card rounded-lg border",
            "p-3 ios-safe-left ios-safe-right"
          )}>
            {/* Avatar + Info */}
            <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
              <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
              <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base truncate">{creator.full_name}</h2>
              <div className="flex items-center gap-2">
                {liveSession ? (
                  <Badge className="bg-red-500 text-white text-xs">🔴 LIVE</Badge>
                ) : isOnline ? (
                  <Badge className="bg-green-500 text-white text-xs">🟢 Online</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Offline</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {queueCount} waiting
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Queue Status Banner - iOS Optimized */}
        {isInQueue && (
          <Card className="mb-4 ios-safe-left ios-safe-right">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                {/* Queue Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    In Queue - Position {actualPosition || '...'} • {calculateWaitTime(actualPosition)} min wait
                  </h3>
                </div>
                
                {/* Leave Button - Always Visible */}
                <Button
                  onClick={handleLeaveQueue}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-9 px-4"
                >
                  Leave Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting Status Banner - When consented and next up */}
        {isInQueue && actualPosition === 1 && (hasConsentedToBroadcast || consentResolvedRef.current) && (
          <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg ios-safe-left ios-safe-right">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-cyan-600 dark:text-cyan-400">
                  Waiting for Creator to Start Call
                </h3>
                <p className="text-sm text-muted-foreground">
                  You're ready! {creator.full_name} can see your preview and will invite you shortly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid gap-6 grid-cols-1">
          {/* Video section - Only visible when in queue */}
          {isInQueue && (
            <div>
              <div className="bg-black rounded-lg overflow-hidden border h-[400px] sm:h-[500px]">
                <BroadcastViewer 
                  creatorId={creatorId!} 
                  sessionId={liveSession?.id || 'connecting'}
                  isInQueue={isInQueue}
                  shouldPublishFanVideo={(hasConsentedToBroadcast || consentResolvedRef.current) || forceBroadcast}
                  consentStream={consentStream}
                  creatorName={creator.full_name}
                />
              </div>
            </div>
          )}

          {/* Join form - Only shown when not in queue */}
          {!isInQueue && (
            <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isInQueue ? 'In Queue' : 'Join the Queue'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!isInQueue ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Your Name
                      </label>
                      <Input
                        ref={inputRef}
                        placeholder="Enter your name"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          userEditedNameRef.current = true;
                        }}
                        onFocus={() => {
                          userEditedNameRef.current = true;
                        }}
                        autoComplete="name"
                        name="displayName"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Discussion topic (optional)
                      </label>
                      <Textarea
                        placeholder="e.g., Career advice..."
                        value={discussionTopic}
                        onChange={(e) => setDiscussionTopic(e.target.value)}
                        className="min-h-[50px] resize-none text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleJoinQueue}
                      disabled={joining || !displayName.trim()}
                      className="w-full h-9"
                    >
                      {joining ? 'Joining...' : 'Join Queue'}
                    </Button>
                  </div>
                 ) : (
                  <div className="space-y-2.5">
                    <div className="text-center">
                      <div className="text-2xl mb-1">✅</div>
                      <p className="font-medium text-sm mb-1">You're in queue!</p>
                      {actualPosition !== null && (
                        <div className="mb-2">
                          {actualPosition === 1 ? (
                            <Badge className="bg-primary text-primary-foreground">
                              🎯 You're Next Up!
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Position: {actualPosition}
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {actualPosition === 1 
                          ? (hasConsentedToBroadcast || consentResolvedRef.current)
                            ? "Broadcasting to creator - wait for them to start your call"
                            : "Click 'I Agree' when ready to start broadcasting"
                          : "The creator will connect with you soon"
                        }
                      </p>
                      {discussionTopic && (
                        <div className="mt-2 p-2 bg-muted rounded border">
                          <p className="text-xs text-muted-foreground mb-0.5">Your topic:</p>
                          <p className="text-xs">{discussionTopic}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleLeaveQueue}
                      variant="outline"
                      className="w-full h-9"
                    >
                      Leave Queue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* Chat section below video */}
        {(() => {
          // Compute effective consent OUTSIDE the JSX so React tracks it properly
          const effectiveHasConsented = hasConsentedToBroadcast || consentResolvedRef.current;

          console.log('[JoinQueue] Consent states for chat:', {
            hasConsentedToBroadcast,
            consentResolved: consentResolvedRef.current,
            effectiveHasConsented,
            actualPosition,
            queueEntryId
          });

          return user && (
            <div className="mt-6">
              <QueueChat 
                creatorId={creatorId!}
                fanId={user.id}
                isInQueue={isInQueue}
                actualPosition={actualPosition}
                hasConsented={effectiveHasConsented}
              />
            </div>
          );
        })()}
      </div>

      {/* Next Up Consent Modal */}
      <NextUpConsentModal
        open={showConsentModal}
        onConsented={handleConsentAgree}
        onLeaveQueue={handleConsentDecline}
        creatorName={creator?.full_name || 'Creator'}
        isProcessing={isUpdatingConsent}
      />
      </div>
    </ErrorBoundary>
  );
}