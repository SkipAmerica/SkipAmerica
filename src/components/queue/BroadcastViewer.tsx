import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mediaManager } from '@/media/MediaOrchestrator';
import { generateViewerId } from '@/utils/viewer-id';
import { resolveCreatorUserId, canonicalChannelFor, legacyQueueChannelFor } from '@/lib/queueResolver';
import { isQueueFallbackEnabled } from '@/lib/env';
import { isDebug } from '@/lib/debugFlag';
import { guardChannelUnsubscribe, allowTeardownOnce } from '@/lib/realtimeGuard';

interface BroadcastViewerProps {
  creatorId: string;
  sessionId: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

type ConnectionState = 'checking' | 'connecting' | 'connected' | 'failed' | 'offline' | 'retry';

export function BroadcastViewer({ creatorId, sessionId }: BroadcastViewerProps) {
  const queueId = creatorId; // The creatorId parameter is actually the queueId from URL
  
  if (!queueId) {
    return <div className="p-4 text-red-500">No queue ID provided</div>;
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewerIdRef = useRef<string>(generateViewerId());
  const [isMuted, setIsMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [offerRetryCount, setOfferRetryCount] = useState(0);
  const [resolvedCreatorId, setResolvedCreatorId] = useState<string | null>(null);
  const [channelType, setChannelType] = useState<'primary' | 'fallback' | null>(null);
  const [debugStats, setDebugStats] = useState({
    signalingState: 'stable',
    iceConnectionState: 'closed',
    connectionState: 'closed',
    remoteTrackCount: 0,
    videoResolution: '0x0',
    iceCandidateCount: 0
  });
  const debugIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidateCountRef = useRef(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any | null>(null);
  const attemptRef = useRef(0);
  const subscribedRef = useRef(false);
  const offerPromiseRef = useRef<{ resolve: () => void; reject: () => void } | null>(null);
  const closedStrikesRef = useRef(0);
  const fallbackChannelRef = useRef<any | null>(null);
  // allowTeardownRef removed - using global guard now

  // ICE server configuration for peer connections
  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Remove local guard - using global guard now

  // Ensure we have an open RTCPeerConnection
  function ensureOpenPc(): RTCPeerConnection {
    const prev = pcRef.current;
    if (!prev || prev.connectionState === 'closed' || prev.signalingState === 'closed') {
      const cfg: RTCConfiguration = {
        iceServers: (import.meta.env.VITE_ICE_SERVERS
          ? JSON.parse(import.meta.env.VITE_ICE_SERVERS)
          : [{ urls: ['stun:stun.l.google.com:19302'] }])
      };
      const pc = new RTCPeerConnection(cfg);
      // reattach existing handlers
      pc.ontrack = (e) => {
        if (videoRef.current) {
          const stream = e.streams?.[0] ?? new MediaStream([e.track]);
          videoRef.current.srcObject = stream;
          setConnectionState('connected');
          setRetryCount(0);
          setOfferRetryCount(0);
          
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
          console.log(`[BROADCAST_VIEWER:${viewerIdRef.current}] Stream connected successfully`);
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          iceCandidateCountRef.current += 1;
          console.log(`[RTC-DEBUG] ICE candidate generated locally (count: ${iceCandidateCountRef.current})`);
          console.log(`[VIEWER ${viewerIdRef.current}] LOCAL ICE TX`);
          channelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { viewerId: viewerIdRef.current, candidate: e.candidate }
          });
        }
      };
      pc.onconnectionstatechange = () => {
        console.log('[VIEWER', viewerIdRef.current, '] PC state=', pc.connectionState, 'signal=', pc.signalingState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('[VIEWER', viewerIdRef.current, '] prevented runtime unsubscribe on connection state change');
          // DO NOT unsubscribe here - let retry logic handle reconnection
          setConnectionState('failed');
        }
      };
      pcRef.current = pc;
      console.log('[VIEWER', viewerIdRef.current, '] created fresh RTCPeerConnection');
      return pc;
    }
    return prev;
  }

  // Helper to get the effective creator ID for DB operations
  const getEffectiveCreatorId = () => {
    return resolvedCreatorId || queueId;
  };

  // Check if creator is broadcasting - uses resolved creator ID if available
  const checkCreatorBroadcastStatus = async (): Promise<boolean> => {
    try {
      const effectiveCreatorId = getEffectiveCreatorId();
      console.log(`[BROADCAST_VIEWER] Checking if creator is broadcasting: ${effectiveCreatorId}`);
      
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('creator_id', effectiveCreatorId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isBroadcasting = !!liveSession;
      console.log('[BROADCAST_VIEWER] Creator broadcasting status:', isBroadcasting);
      
      return isBroadcasting;
    } catch (error) {
      console.error('[BROADCAST_VIEWER] Error checking broadcast status:', error);
      // If we can't verify, don't block the connection attempt
      return true;
    }
  };

  // Fetch lobby chat messages
  useEffect(() => {
    const targetCreatorId = resolvedCreatorId || queueId;
    if (!targetCreatorId) return;

    const fetchMessages = async () => {
      try {
        const { data: messagesData } = await supabase
          .from('lobby_chat_messages')
          .select('id, user_id, message, created_at')
          .eq('creator_id', targetCreatorId)
          .order('created_at', { ascending: true })
          .limit(20);

        if (messagesData && messagesData.length > 0) {
          const userIds = [...new Set(messagesData.map(msg => msg.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const messagesWithProfiles = messagesData.map(msg => ({
            ...msg,
            profiles: profilesData?.find(p => p.id === msg.user_id)
          }));

          setMessages(messagesWithProfiles);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = guardChannelUnsubscribe(
      supabase.channel('broadcast-chat-messages'),
      'chat-messages'
    )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lobby_chat_messages',
          filter: `creator_id=eq.${targetCreatorId}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profile
          } as ChatMessage;

          setMessages(prev => [...prev.slice(-19), newMessage]);
        }
      )
      .subscribe();

    // Remove cleanup - unsubscribe only on unmount
  }, [queueId, resolvedCreatorId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Real-time subscription to live session changes - wait for resolution, then watch resolved and fallback IDs
  useEffect(() => {
    if (!queueId || resolvedCreatorId === undefined) return;

    const resolvedId = resolvedCreatorId || queueId;
    console.log('[BROADCAST_VIEWER] Setting up live session subscriptions for creator:', {
      resolvedId,
      rawId: queueId
    });

    const channels: any[] = [];

    // Primary subscription for resolved/effective creator ID
    const resolvedChannel = guardChannelUnsubscribe(
      supabase.channel(`broadcast-live-session-${resolvedId}`),
      `live-session-${resolvedId}`
    )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `creator_id=eq.${resolvedId}`
        },
        (payload) => {
          console.log('[BROADCAST_VIEWER] Live session change detected (resolved):', payload);

          if (payload.eventType === 'INSERT') {
            console.log('[BROADCAST_VIEWER] Creator went live (resolved) - attempting connection');
            setRetryCount(0);
            setConnectionState('checking');
          } else if (payload.eventType === 'UPDATE' && payload.new.ended_at) {
            console.log('[BROADCAST_VIEWER] Creator stopped broadcasting (resolved)');
            setConnectionState('offline');
          } else if (payload.eventType === 'DELETE') {
            console.log('[BROADCAST_VIEWER] Live session deleted (resolved)');
            setConnectionState('offline');
          }
        }
      )
      .subscribe();

    channels.push(resolvedChannel);

    // If resolved differs from raw, also subscribe to raw as fallback
    if (resolvedCreatorId && resolvedCreatorId !== queueId) {
      const rawChannel = guardChannelUnsubscribe(
        supabase.channel(`broadcast-live-session-${queueId}`),
        `live-session-${queueId}`
      )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_sessions',
            filter: `creator_id=eq.${queueId}`
          },
          (payload) => {
            console.log('[BROADCAST_VIEWER] Live session change detected (raw fallback):', payload);

            if (payload.eventType === 'INSERT') {
              console.log('[BROADCAST_VIEWER] Creator went live (raw fallback) - attempting connection');
              setRetryCount(0);
              setConnectionState('checking');
            } else if (payload.eventType === 'UPDATE' && payload.new.ended_at) {
              console.log('[BROADCAST_VIEWER] Creator stopped broadcasting (raw fallback)');
              setConnectionState('offline');
            } else if (payload.eventType === 'DELETE') {
              console.log('[BROADCAST_VIEWER] Live session deleted (raw fallback)');
              setConnectionState('offline');
            }
          }
        )
        .subscribe();

      channels.push(rawChannel);
    }

    return () => {
      // Remove cleanup - unsubscribe only on unmount  
    };
  }, [queueId, resolvedCreatorId]);

  // Continuous monitoring with polling backup (wait for resolution) - UI only
  useEffect(() => {
    if (!queueId || resolvedCreatorId === undefined) return;

    const pollInterval = setInterval(async () => {
      const isBroadcasting = await checkCreatorBroadcastStatus();
      
      if (isBroadcasting && (connectionState === 'offline' || connectionState === 'failed')) {
        console.log('[BROADCAST_VIEWER] Polling detected creator is broadcasting - reconnecting');
        setConnectionState('checking');
      } else if (!isBroadcasting) {
        console.log('[BROADCAST_VIEWER] Polling detected creator not broadcasting (UI only)');
        // Keep connection active - only update UI state, don't tear down
        if (connectionState !== 'offline' && connectionState !== 'failed') {
          setConnectionState('offline');
        }
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [queueId, resolvedCreatorId, connectionState]);

  // Resolve queueId to creator_user_id on mount and auto-connect
  useEffect(() => {
    const resolveCreator = async () => {
      if (!queueId) return;
      
      console.log(`[QUEUE_RESOLVER] Resolving queueId: ${queueId}`);
      const creatorUserId = await resolveCreatorUserId(queueId);
      console.log(`[QUEUE_RESOLVER] Resolved:`, creatorUserId ? `creator_user_id=${creatorUserId}` : 'no mapping');
      
      setResolvedCreatorId(creatorUserId);
      
      // Auto-connect after resolution completes
      if (connectionState === 'checking' || connectionState === 'offline') {
        console.log(`[QUEUE_RESOLVER] Auto-triggering connection after resolution`);
        setConnectionState('checking');
      }
    };
    
    resolveCreator();
  }, [queueId, connectionState]);

  // WebRTC connection management - subscribe immediately after resolution
  useEffect(() => {
    if (resolvedCreatorId === undefined) return;

    // Ensure websocket connection before subscribing
    const ensureRealtimeConnected = () => {
      try {
        (supabase as any)?.realtime?.connect?.();
      } catch (error) {
        console.warn('[BROADCAST_VIEWER] Could not ensure realtime connection:', error);
      }
    };

    // Serialized subscription with channel reuse and deep logging
    const ensureSubscribed = async (channelName: string, isFallback = false) => {
      // If we already have a channel that is alive, return it
      const ch = isFallback ? fallbackChannelRef.current : channelRef.current;
      if (ch && !['closed', 'errored'].includes((ch as any).state || '')) {
        return ch;
      }

      // Bump attempt id and capture it
      const myAttempt = ++attemptRef.current;
      subscribedRef.current = false;

      ensureRealtimeConnected();

      // Patch client-level teardown methods (once per component mount)
      const _rt: any = (supabase as any)?.realtime;
      if (_rt && !_rt.__patched) {
        _rt.__patched = true;
        const origDisconnect = _rt.disconnect?.bind(_rt);
        if (origDisconnect) {
          _rt.disconnect = (...args: any[]) => {
            console.warn('[VIEWER', viewerIdRef.current, '] supabase.realtime.disconnect CALLED! stack:\n', new Error().stack);
            return origDisconnect(...args);
          };
        }
        const origRemove = (supabase as any).removeChannel?.bind(supabase);
        if (origRemove) {
          (supabase as any).removeChannel = (...args: any[]) => {
            console.warn('[VIEWER', viewerIdRef.current, '] supabase.removeChannel CALLED! args=', args, 'stack:\n', new Error().stack);
            return origRemove(...args);
          };
        }
      }

      // Log existing channels before creating new one
      console.log('[VIEWER', viewerIdRef.current, '] existing channels:', 
        (supabase.getChannels?.() || []).map(c => (c as any).topic));

      // Ensure auth is ready
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.error('[VIEWER', viewerIdRef.current, '] anon sign-in fail:', error);
      }
      console.log('[VIEWER', viewerIdRef.current, '] auth ready:', !!(await supabase.auth.getSession()).data.session);

      // Create a fresh channel and attach handlers BEFORE subscribe
      const newCh = supabase.channel(channelName);
      console.log('[VIEWER', viewerIdRef.current, '] canonical channel new?', !channelRef.current, 'topic=', newCh.topic,
                  'patched=', !!(newCh as any).__origUnsub);
      
      // Ensure we reuse a single instance
      if (!channelRef.current || channelRef.current.topic !== newCh.topic) {
        if (isFallback) {
          fallbackChannelRef.current = newCh;
        } else {
          channelRef.current = newCh;
        }
      }

      // Use the stored channel for handlers
      const channelToSetup = isFallback ? fallbackChannelRef.current : channelRef.current;

      // Add deep lifecycle logging BEFORE attaching handlers
      channelToSetup.on('system', { event: 'phx_error' }, (e) => 
        console.warn('[VIEWER', viewerIdRef.current, '] SYSTEM phx_error on', channelToSetup.topic, e));
      channelToSetup.on('system', { event: 'phx_close' }, (e) => 
        console.warn('[VIEWER', viewerIdRef.current, '] SYSTEM phx_close on', channelToSetup.topic, e));
      channelToSetup.on('system', { event: 'phx_reply' }, (e) => 
        console.log('[VIEWER', viewerIdRef.current, '] SYSTEM phx_reply on', channelToSetup.topic, e?.status, e?.response));

      attachOfferAndIceHandlers(channelToSetup);
      console.log('[VIEWER', viewerIdRef.current, '] subscribing to', channelName, 'attempt', myAttempt, isFallback ? '(fallback)' : '');

      // Await SUBSCRIBED (with timeout)
      const result = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>(resolve => {
        const t = setTimeout(() => resolve('TIMED_OUT'), 8000);
        channelToSetup.subscribe((status) => {
          console.log('[VIEWER', viewerIdRef.current, '] channel status=', status, 'on', channelName);
          
          if (status === 'CLOSED' && !isFallback) {
            closedStrikesRef.current++;
            console.warn('[VIEWER', viewerIdRef.current, `] canonical CLOSED (strike ${closedStrikesRef.current}) on`, channelName);
            console.warn('[VIEWER', viewerIdRef.current, '] prevented runtime unsubscribe on CLOSED status');
            // DO NOT unsubscribe here - keep channel alive for retry
            
            // Fallback logic after 3 strikes
            if (closedStrikesRef.current >= 3) {
              const fallbackEnabled = String(import.meta.env.VITE_ENABLE_QUEUE_FALLBACK) === 'true';
              if (fallbackEnabled && !fallbackChannelRef.current) {
                const legacy = legacyQueueChannelFor(queueId);
                console.warn('[DEPRECATED] Also subscribing to legacy due to repeated CLOSED on canonical:', legacy);
                // Trigger fallback subscription in background
                setTimeout(() => ensureSubscribed(legacy, true), 100);
              }
            }
          }
          
          if (status === 'SUBSCRIBED') { clearTimeout(t); resolve('SUBSCRIBED'); }
          if (status === 'CLOSED') { clearTimeout(t); resolve('CLOSED'); }
        });
      });

      // If another attempt started while we waited, mark this one stale and do nothing
      if (myAttempt !== attemptRef.current) {
        console.warn('[VIEWER', viewerIdRef.current, '] stale subscribe attempt', myAttempt, 'ignoring');
        return (isFallback ? fallbackChannelRef.current : channelRef.current)!;
      }

      if (result === 'SUBSCRIBED') {
        subscribedRef.current = true;
        console.log('[VIEWER', viewerIdRef.current, '] SUBSCRIBED on', channelName);
        return newCh;
      }

      console.warn('[VIEWER', viewerIdRef.current, `] subscribe result=${result} on`, channelName);
      return null;
    };

    // Request offer with retries without tearing down channel
    const requestOfferWithRetries = async (ch: any, max = 3) => {
      for (let i = 1; i <= max; i++) {
        ch.send({ type: 'broadcast', event: 'request-offer', payload: { viewerId: viewerIdRef.current } });
        console.log('[VIEWER', viewerIdRef.current, `] REQUEST-OFFER TX (#${i})`);
        
        const gotOffer = await waitForOfferOrDelay(5000);
        if (gotOffer) return true;
      }
      return false;
    };

    // Wait for offer or timeout
    const waitForOfferOrDelay = (timeoutMs: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (offerPromiseRef.current) {
            offerPromiseRef.current = null;
          }
          resolve(false);
        }, timeoutMs);

        offerPromiseRef.current = {
          resolve: () => {
            clearTimeout(timeout);
            offerPromiseRef.current = null;
            resolve(true);
          },
          reject: () => {
            clearTimeout(timeout);
            offerPromiseRef.current = null;
            resolve(false);
          }
        };
      });
    };

    // Attach handlers to channel (extracted for reuse)
    const attachOfferAndIceHandlers = (signalChannel: any) => {
      signalChannel
        .on('broadcast', { event: 'offer' }, async (e: any) => {
          const p = e.payload ?? e ?? {};
          const { viewerId: vid, sdp } = p;
          if (vid !== viewerIdRef.current || !sdp) return;
          
          // Signal that we got an offer
          if (offerPromiseRef.current) {
            offerPromiseRef.current.resolve();
          }
          
          const pc = ensureOpenPc();
          
          // If we already set a local offer earlier, rollback first
          if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-local-pranswer') {
            try { await pc.setLocalDescription({ type: 'rollback' } as any); } catch {}
          }
          
          await pc.setRemoteDescription({ type: 'offer', sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalChannel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { viewerId: viewerIdRef.current, sdp: answer.sdp }
          });
          console.log('[VIEWER', viewerIdRef.current, '] ANSWER TX len=', answer.sdp.length);
        })
        .on('broadcast', { event: 'ice-candidate' }, async (e: any) => {
          const p = e.payload ?? e ?? {};
          const { viewerId: vid, candidate } = p;
          if (vid !== viewerIdRef.current || !candidate) return;
          
          const pc = ensureOpenPc();
          try { 
            await pc.addIceCandidate(candidate); 
            iceCandidateCountRef.current += 1;
            console.log(`[RTC-DEBUG] ICE candidate received (count: ${iceCandidateCountRef.current})`);
            console.log(`[VIEWER ${viewerIdRef.current}] REMOTE ICE RX`);
          } catch (err) {
            console.warn('[VIEWER', viewerIdRef.current, '] addIceCandidate failed', err);
          }
        })
        .on('broadcast', { event: 'creator-offline' }, (e: any) => {
          console.log(`[VIEWER ${viewerIdRef.current}] Creator went offline`);
          setConnectionState('offline');
          // Allow teardown ONLY for explicit creator-offline
          allowTeardownOnce(() => {
            try { channelRef.current?.unsubscribe?.(); } catch {}
            try { fallbackChannelRef.current?.unsubscribe?.(); } catch {}
          });
          try { pcRef.current?.close(); pcRef.current = null; } catch {}
        });
    };

    const connectToCreatorBroadcast = async () => {
      try {
        const viewerId = viewerIdRef.current;
        console.log(`[BROADCAST_VIEWER:${viewerId}] Starting connection attempt`, retryCount + 1);
        setConnectionState('connecting');
        
        // Ensure we have an open peer connection (creates fresh if needed)
        const peerConnection = ensureOpenPc();

        // Determine channels to use
        const primaryChannel = resolvedCreatorId ? canonicalChannelFor(resolvedCreatorId) : null;
        const fallbackChannel = legacyQueueChannelFor(queueId);
        const fallbackEnabled = isQueueFallbackEnabled();
        
        let channelToUse: string | null = null;
        let usingFallback = false;
        
        if (primaryChannel) {
          channelToUse = primaryChannel;
          setChannelType('primary');
        } else if (fallbackEnabled) {
          channelToUse = fallbackChannel;
          usingFallback = true;
          console.warn('[DEPRECATED] Fallback queue channel used:', fallbackChannel);
          setChannelType('fallback');
        } else {
          console.warn('[VIEWER] No mapping for queueId and fallback disabled:', queueId);
          setConnectionState('failed');
          return;
        }

        console.log(`[BROADCAST_VIEWER:${viewerId}] Connecting to ${usingFallback ? 'fallback' : 'primary'} channel: ${channelToUse}`);

        // Prove Realtime works with debug channel first
        if (isDebug()) {
          const dbg = guardChannelUnsubscribe(
            supabase.channel('debug:ping:' + viewerId),
            'debug-ping'
          );
          dbg.subscribe((s) => {
            if (s === 'SUBSCRIBED') {
              console.log('[VIEWER', viewerId, '] DEBUG channel SUBSCRIBED ok:', dbg.topic);
              // Attempt to leave debug channel, but use global guard
              allowTeardownOnce(() => {
                try { dbg.unsubscribe?.(); } catch {}
              });
            }
            if (s === 'CLOSED') {
              console.warn('[VIEWER', viewerId, '] DEBUG channel CLOSED:', dbg.topic);
            }
          });
        }

        // Subscribe with channel reuse
        const ch = await ensureSubscribed(channelToUse);
        if (ch && subscribedRef.current) {
          const ok = await requestOfferWithRetries(ch, 3);
          if (!ok) {
            console.warn('[VIEWER', viewerId, '] No offer after retries; staying subscribed.');
          }
        } else {
          console.error('[VIEWER', viewerId, '] Failed to subscribe; will retry later without teardown.');
          setConnectionState('failed');
        }

        console.log(`[BROADCAST_VIEWER:${viewerIdRef.current}] WebRTC setup complete`);

      } catch (error) {
        console.error(`[BROADCAST_VIEWER:${viewerIdRef.current}] Error setting up WebRTC:`, error);
        setConnectionState('failed');
      }
    };

    const handleOfferRetry = () => {
      const maxOfferRetries = 3;
      if (offerRetryCount >= maxOfferRetries) {
        console.log(`[BROADCAST_VIEWER:${viewerIdRef.current}] Max offer retries reached`);
        setConnectionState('failed');
        return;
      }
      
      setOfferRetryCount(prev => prev + 1);
      const retryDelay = [5000, 8000, 13000][offerRetryCount] || 13000; // Exponential backoff: 5s, 8s, 13s
      
      console.log(`[BROADCAST_VIEWER:${viewerIdRef.current}] Retrying offer request in ${retryDelay}ms (attempt ${offerRetryCount + 1})`);
      
      setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'request-offer',
            payload: { viewerId: viewerIdRef.current }
          });
          
          // Set up timeout for next retry
          connectionTimeoutRef.current = setTimeout(() => {
            handleOfferRetry();
          }, 5000);
        }
      }, retryDelay);
    };

    // Queue cleanup helper
    const cleanupQueueEntry = async () => {
      if (!resolvedCreatorId) return;
      
      try {
        // Get current user from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('call_queue')
          .delete()
          .eq('creator_id', resolvedCreatorId)
          .eq('fan_id', user.id);
        
        console.log('[BROADCAST_VIEWER] Removed user from queue due to connection failure');
      } catch (error) {
        console.error('[BROADCAST_VIEWER] Error cleaning up queue:', error);
      }
    };

    const cleanup = () => {
      console.warn('[VIEWER', viewerIdRef.current, '] cleanup() called from:', new Error().stack);
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
      
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
      
      // Cleanup queue entry when connection fails or disconnects
      if (connectionState === 'failed' || connectionState === 'offline') {
        cleanupQueueEntry();
      }
    };

    const initConnection = async () => {
      // Only attempt connection in 'checking' or 'retry' state
      if (connectionState !== 'checking' && connectionState !== 'retry') {
        return;
      }

      // Subscribe immediately regardless of broadcast status
      console.log('[BROADCAST_VIEWER] Connecting without teardown');

      // Proceed with WebRTC connection
      await connectToCreatorBroadcast();
    };

    // Setup debug stats monitoring if debug=1 is in URL
    const isDebugMode = window.location.search.includes('debug=1');
    if (isDebugMode && !debugIntervalRef.current) {
      debugIntervalRef.current = setInterval(() => {
        if (pcRef.current) {
          const video = videoRef.current;
          const videoResolution = video && video.videoWidth && video.videoHeight 
            ? `${video.videoWidth}x${video.videoHeight}` 
            : '0x0';
          
          const remoteStreams = video?.srcObject ? (video.srcObject as MediaStream).getTracks().length : 0;
          
          setDebugStats({
            signalingState: pcRef.current.signalingState,
            iceConnectionState: pcRef.current.iceConnectionState,
            connectionState: pcRef.current.connectionState,
            remoteTrackCount: remoteStreams,
            videoResolution,
            iceCandidateCount: iceCandidateCountRef.current
          });
        }
      }, 1000);
    }

    // Initialize connection when in appropriate states
    if (connectionState === 'checking' || connectionState === 'retry') {
      initConnection();
    }

    // No cleanup here - let unmount-only effect handle it
  }, [resolvedCreatorId, viewerIdRef.current]); // Only re-run when creatorUserId changes, not on UI state

  // UNMOUNT-only cleanup effect
  useEffect(() => {
    return () => {
      allowTeardownOnce(() => {
        try { channelRef.current?.unsubscribe?.(); } catch {}
        try { fallbackChannelRef.current?.unsubscribe?.(); } catch {}
      });
      try { pcRef.current?.close?.(); } catch {}
    };
  }, []);

  const handleRetry = async () => {
    console.log('[BROADCAST_VIEWER] Manual retry triggered');
    const maxRetries = 5;
    
    if (retryCount >= maxRetries) {
      console.log('[BROADCAST_VIEWER] Max retries reached, showing offline');
      setConnectionState('offline');
      return;
    }
    
    // Reset both retry counts for a fresh start
    setRetryCount(prev => prev + 1);
    setOfferRetryCount(0);
    setConnectionState('retry');
    
    // Add exponential backoff for automatic retries
    setTimeout(() => {
      setConnectionState('checking');
    }, Math.min(1000 * Math.pow(2, retryCount), 10000)); // Max 10 second delay
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
    .slice(0, 2);
  };

  const handleDumpStats = async () => {
    if (!pcRef.current) return;
    
    try {
      const stats = await pcRef.current.getStats();
      console.log('[RTC-DEBUG] === STATS DUMP ===');
      
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          console.log(`[RTC-DEBUG] Inbound Video - bytes: ${report.bytesReceived}, frames: ${report.framesDecoded}, size: ${report.frameWidth}x${report.frameHeight}`);
        } else if (report.type === 'outbound-rtp') {
          console.log(`[RTC-DEBUG] Outbound - bytes: ${report.bytesSent}, packets: ${report.packetsSent}`);
        }
      });
      
      console.log('[RTC-DEBUG] === END STATS ===');
    } catch (error) {
      console.error('[RTC-DEBUG] Error getting stats:', error);
    }
  };

  const renderConnectionState = () => {
    switch (connectionState) {
      case 'checking':
        return (
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Checking broadcast status...</p>
          </div>
        );
      
      case 'connecting':
        return (
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Connecting to broadcast...</p>
          </div>
        );
      
      case 'failed':
        return (
          <div className="text-center text-white space-y-3">
            <div className="text-red-400">
              <p className="text-sm mb-2">Failed to connect to broadcast</p>
              <p className="text-xs opacity-75">The creator may not be broadcasting</p>
            </div>
            <Button
              onClick={handleRetry}
              size="sm"
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        );
      
      case 'offline':
        return (
          <div className="text-center text-white space-y-3">
            <div>
              <p className="text-sm mb-2">Creator is not broadcasting</p>
              <p className="text-xs opacity-75">Check back later when they go live</p>
            </div>
            <Button
              onClick={handleRetry}
              size="sm"
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {/* Always render video element for WebRTC to work */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${connectionState === 'connected' ? 'block' : 'hidden'}`}
        autoPlay
        playsInline
        muted={isMuted}
        onLoadedMetadata={() => {
          // Ensure video starts muted for autoplay policies
          if (videoRef.current) {
            videoRef.current.muted = isMuted;
          }
        }}
      />
      
      {connectionState === 'connected' && (
        <>
          {/* Video Controls Overlay */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              onClick={toggleMute}
              size="sm"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white border-0"
              title={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Live Indicator */}
          <div className="absolute top-4 left-4">
            <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              LIVE
            </div>
          </div>

          {/* Live Chat Overlay */}
          {messages.length > 0 && (
            <div 
              ref={chatRef}
              className="absolute bottom-16 left-2 right-2 max-h-32 overflow-y-auto space-y-1 scrollbar-hide"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)'
              }}
            >
              {messages.slice(-10).map((message) => (
                <div 
                  key={message.id}
                  className="bg-black/60 px-2 py-1 rounded text-white text-xs backdrop-blur-sm"
                >
                  <span className="font-medium text-blue-300">
                    {message.profiles?.full_name || 'User'}:
                  </span>{' '}
                  {message.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {connectionState !== 'connected' && (
        <div className="w-full h-full flex items-center justify-center">
          {renderConnectionState()}
        </div>
      )}

    </div>
  );
}