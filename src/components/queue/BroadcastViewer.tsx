import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { mediaManager } from '@/media/MediaOrchestrator';
import { generateViewerId } from '@/utils/viewer-id';
import { resolveCreatorUserId, canonicalChannelFor, legacyQueueChannelFor } from '@/lib/queueResolver';
import { isQueueFallbackEnabled } from '@/lib/env';
import { isDebug } from '@/lib/debugFlag';
import { guardChannelUnsubscribe, allowTeardownOnce } from '@/lib/realtimeGuard';
import { runWithTeardownAllowed } from '@/lib/realtimeTeardown';
import DebugHUD from '@/components/dev/DebugHUD';
import { createSFU } from '@/lib/sfu';
import { hudLog, hudError } from '@/lib/hud';

const TOKEN_URL = "https://ytqkunjxhtjsbpdrwsjf.functions.supabase.co/get_livekit_token";

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
  const USE_SFU = true; // Feature flag for LiveKit SFU
  
  if (!queueId) {
    return <div className="p-4 text-red-500">No queue ID provided</div>;
  }

  const DEBUG =
    typeof window !== 'undefined' &&
    /(?:^|[?&])debug=1(?:&|$)/.test(window.location.search);

  const InlineHUD = () => {
    if (!DEBUG) return null;
    const pc = pcRef.current;
    const v = videoRef.current;
    const ms = (remoteMsRef?.current as MediaStream | undefined);
    return (
      <div style={{position:'fixed',top:8,right:8,zIndex:9999,background:'rgba(0,0,0,0.7)',color:'#fff',fontFamily:'ui-monospace,Menlo,monospace',fontSize:12,lineHeight:1.35,padding:'10px 12px',borderRadius:8,pointerEvents:'none',maxWidth:360}}>
        <div style={{fontWeight:700,marginBottom:6}}>PQ Viewer (inline HUD)</div>
        <div>Viewer: {viewerIdRef.current}</div>
        <div>Channel: {channelRef.current?.topic || '—'}</div>
        <div>Ch Status: {lastChannelStatus || '—'}</div>
        <div>PC: {pc?.connectionState || '—'} | Signal: {pc?.signalingState || '—'}</div>
        <div>ICE: {pc?.iceConnectionState || '—'}</div>
        <div>Tracks: {ms ? ms.getTracks().length : 0}</div>
        <div>VideoReady: {v ? v.readyState : '—'} Paused: {String(!!v?.paused)}</div>
        <div>Req#: {offerRequestCountRef?.current ?? 0} OfferRx#: {offersReceivedRef?.current ?? 0} AnsTx#: {answersSentRef?.current ?? 0}</div>
        <div>Pong#: {pongCountRef?.current ?? 0}</div>
        <div>KeepAlive: {!!slowRetryRef.current.timer} ticks={slowRetryRef.current.ticks}</div>
      </div>
    );
  };

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
  
  // Debug counters and state
  const offerRequestCountRef = useRef(0);
  const offersReceivedRef = useRef(0);
  const answersSentRef = useRef(0);
  const iceRxCountRef = useRef(0);
  const pongCountRef = useRef(0);
  const [lastChannelStatus, setLastChannelStatus] = useState<string>('—');

  function stopSlowRetry(reason?: string) {
    if (slowRetryRef.current.timer) {
      clearInterval(slowRetryRef.current.timer);
      slowRetryRef.current.timer = null;
    }
    slowRetryRef.current.ticks = 0;
    if (DEBUG && reason) console.log('[VIEWER', viewerIdRef.current, '] slow-retry STOP', reason);
  }

  function sendRequestOffer(reason: string) {
    const payload = { viewerId: viewerIdRef.current, ts: Date.now(), reason };
    channelRef.current?.send({ type: 'broadcast', event: 'request-offer', payload });
    // Optional: ping (if creator does pong)
    channelRef.current?.send({ type: 'broadcast', event: 'ping', payload });
    offerRequestCountRef.current = (offerRequestCountRef.current ?? 0) + 1;
  }

  function startSlowRetry(reason: string, intervalMs = 5000) {
    if (!channelRef.current) return;
    // If already connected or offer received, don't start.
    if (pcRef.current?.connectionState === 'connected' || (offersReceivedRef.current ?? 0) > 0) return;
    if (slowRetryRef.current.timer) return; // already running

    if (DEBUG) console.log('[VIEWER', viewerIdRef.current, `] slow-retry START (${reason}) every ${intervalMs}ms`);

    slowRetryRef.current.timer = setInterval(() => {
      const connected = pcRef.current?.connectionState === 'connected';
      const gotOffer = (offersReceivedRef.current ?? 0) > 0;
      if (connected || gotOffer) {
        stopSlowRetry(connected ? 'connected' : 'offer-received');
        return;
      }
      // If channel drops to CLOSED, don't increment; just wait for re-subscribe to restart.
      if (lastChannelStatus === 'CLOSED' || lastChannelStatus === 'TIMED_OUT' || lastChannelStatus === 'ERROR') return;

      slowRetryRef.current.ticks++;
      sendRequestOffer('slow-retry');
    }, intervalMs);
  }

  // Offer burst functionality
  const offerBurstRef = useRef<{timer?: any, count: number}>({ count: 0 });
  const slowRetryRef = useRef<{ timer: any | null; ticks: number }>({ timer: null, ticks: 0 });
  const lastAnnounceTsRef = useRef<number>(0);

  function startOfferBurst(reason: string) {
    if (!channelRef.current) return;
    // don't run if already connected or we already got an offer
    if (pcRef.current?.connectionState === 'connected') return;
    offerBurstRef.current.count = 0;
    clearInterval(offerBurstRef.current.timer);
    offerBurstRef.current.timer = setInterval(() => {
      if (pcRef.current?.connectionState === 'connected' || (offersReceivedRef.current ?? 0) > 0) {
        clearInterval(offerBurstRef.current.timer);
        return;
      }
      sendRequestOffer(reason);
      offerBurstRef.current.count++;
      if (offerBurstRef.current.count >= 8) { // stop after ~8s
        clearInterval(offerBurstRef.current.timer);
        // After the burst ends, if we got no offers, start slow retry
        setTimeout(() => {
          if ((offersReceivedRef.current ?? 0) === 0 && pcRef.current?.connectionState !== 'connected') {
            startSlowRetry('post-burst');
          }
        }, 100);
      }
    }, 1000);
  }

  // ICE server configuration for peer connections
  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Ensure we have a persistent MediaStream
  const remoteMsRef = useRef<MediaStream>(new MediaStream());

  function addTrackOnce(track: MediaStreamTrack) {
    const ms: MediaStream = remoteMsRef.current;
    if (!track) return;
    if (!ms.getTracks().some(t => t.id === track.id)) ms.addTrack(track);
  }

  function rebindVideo(tag?: HTMLVideoElement | null) {
    const v = tag ?? videoRef.current;
    if (!v) return;
    const ms = remoteMsRef.current as MediaStream;
    try { (v as any).srcObject = null; } catch {}
    (v as any).srcObject = ms;
    v.muted = true; v.autoplay = true; v.setAttribute('playsinline','');
    try { v.play?.(); } catch (e) { console.warn('[VIEWER', viewerIdRef.current, '] play() rejected', e); }
  }

  function makePc(): RTCPeerConnection {
    const iceServers = import.meta.env.VITE_ICE_SERVERS
      ? JSON.parse(import.meta.env.VITE_ICE_SERVERS)
      : [{ urls: 'stun:stun.l.google.com:19302' }];
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'all' });

    // Pre-create recvonly m-lines so SRD succeeds even if ontrack is late.
    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
    } catch {}

    pc.ontrack = (e) => {
      const s = e.streams?.[0];
      if (s) s.getTracks().forEach(t => addTrackOnce(t));
      else if (e.track) addTrackOnce(e.track);
      rebindVideo();
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      console.log('[VIEWER', viewerIdRef.current, '] PC=', st, 'signal=', pc.signalingState);
      if (st === 'connected') {
        stopSlowRetry('pc-connected');
        queueMicrotask(() => rebindVideo());
        setTimeout(() => rebindVideo(), 200);
      }
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { viewerId: viewerIdRef.current, candidate: ev.candidate }
      });
    };

    rebindVideo();
    return pc;
  }

  function getOpenPc(forceNew = false): RTCPeerConnection {
    const cur = pcRef.current;
    const closed = !cur || cur.signalingState === 'closed' || cur.connectionState === 'failed';
    if (forceNew || closed) {
      try { cur?.close?.(); } catch {}
      pcRef.current = makePc();
    }
    return pcRef.current!;
  }

  useEffect(() => { if (videoRef.current) rebindVideo(videoRef.current); }, [videoRef.current]);

  // Memoized effective creator ID to prevent unnecessary re-computations
  const effectiveCreatorId = useMemo(() => {
    return resolvedCreatorId || queueId;
  }, [resolvedCreatorId, queueId]);

  // Stable callback for checking broadcast status
  const checkCreatorBroadcastStatus = useCallback(async (): Promise<boolean> => {
    try {
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
  }, [effectiveCreatorId]);

  // Stable retry handler
  const handleRetry = useCallback(() => {
    console.log('[BROADCAST_VIEWER] Manual retry triggered');
    setRetryCount(prev => prev + 1);
    setConnectionState('checking');
  }, []);

  // Stable mute toggle handler
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Stable fetch messages callback
  const fetchMessages = useCallback(async () => {
    const targetCreatorId = effectiveCreatorId;
    if (!targetCreatorId) return;

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
  }, [effectiveCreatorId]);

  // Fetch lobby chat messages - optimized with stable callback
  useEffect(() => {
    if (!effectiveCreatorId) return;

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
          filter: `creator_id=eq.${effectiveCreatorId}`
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
  }, [effectiveCreatorId, fetchMessages]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // CONSOLIDATED Real-time subscription to live session changes - single subscription with stability
  useEffect(() => {
    if (!queueId || resolvedCreatorId === undefined) return;

    console.log('[BROADCAST_VIEWER] Setting up consolidated live session subscription for:', effectiveCreatorId);

    // Single subscription channel with debounced state updates
    let stateUpdateTimeout: NodeJS.Timeout | null = null;
    const debouncedStateUpdate = (newState: ConnectionState) => {
      if (stateUpdateTimeout) clearTimeout(stateUpdateTimeout);
      stateUpdateTimeout = setTimeout(() => {
        setConnectionState(newState);
      }, 100); // Debounce rapid state changes
    };

    const channel = guardChannelUnsubscribe(
      supabase.channel(`broadcast-live-session-consolidated-${effectiveCreatorId}`),
      `live-session-consolidated-${effectiveCreatorId}`
    )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `creator_id=eq.${effectiveCreatorId}`
        },
        (payload) => {
          console.log('[BROADCAST_VIEWER] Live session change (consolidated):', payload.eventType);

          if (payload.eventType === 'INSERT') {
            console.log('[BROADCAST_VIEWER] Creator went live - attempting connection immediately');
            setRetryCount(0);
            debouncedStateUpdate('checking');
            
            // Start offer burst when creator goes live
            startOfferBurst('db-insert');
            // also arm slow retry to persist beyond the burst if needed  
            setTimeout(() => {
              if ((offersReceivedRef.current ?? 0) === 0 && pcRef.current?.connectionState !== 'connected') {
                startSlowRetry('after-db-insert');
              }
            }, 2000);
            console.log('[VIEWER] Started offer burst on live session INSERT');
          } else if (payload.eventType === 'UPDATE' && payload.new.ended_at) {
            console.log('[BROADCAST_VIEWER] Creator stopped broadcasting');
            debouncedStateUpdate('offline');
          } else if (payload.eventType === 'DELETE') {
            console.log('[BROADCAST_VIEWER] Live session deleted');
            debouncedStateUpdate('offline');
          }
        }
      )
      .subscribe();

    return () => {
      if (stateUpdateTimeout) clearTimeout(stateUpdateTimeout);
      // Cleanup handled in unmount effect
    };
  }, [queueId, resolvedCreatorId, effectiveCreatorId]);

  // Conditional monitoring with reduced polling (wait for resolution) - UI only
  useEffect(() => {
    if (!queueId || resolvedCreatorId === undefined) return;
    
    // Only poll if we're in a failed/offline state to detect recovery
    if (connectionState !== 'offline' && connectionState !== 'failed') return;

    const pollInterval = setInterval(async () => {
      const isBroadcasting = await checkCreatorBroadcastStatus();
      
      if (isBroadcasting && (connectionState === 'offline' || connectionState === 'failed')) {
        console.log('[BROADCAST_VIEWER] Polling detected creator is broadcasting - reconnecting');
        setConnectionState('checking');
      }
    }, 60000); // Reduced to poll every 60 seconds only when needed

    return () => clearInterval(pollInterval);
  }, [queueId, resolvedCreatorId, connectionState]);

  // Resolve queueId to creator_user_id on mount - DEPENDENCY LOOP FIX: Remove connectionState dependency
  useEffect(() => {
    const resolveCreator = async () => {
      if (!queueId) return;
      
      console.log(`[QUEUE_RESOLVER] Resolving queueId: ${queueId}`);
      const creatorUserId = await resolveCreatorUserId(queueId);
      console.log(`[QUEUE_RESOLVER] Resolved:`, creatorUserId ? `creator_user_id=${creatorUserId}` : 'no mapping');
      
      setResolvedCreatorId(creatorUserId);
      
      // Initial connection trigger only on mount/queueId change
      console.log(`[QUEUE_RESOLVER] Setting initial checking state after resolution`);
      setConnectionState('checking');
    };
    
    resolveCreator();
  }, [queueId]); // FIXED: Remove connectionState dependency to break loop

  // Tab visibility and network online event handlers
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        startOfferBurst('visible');
        setTimeout(() => {
          if ((offersReceivedRef.current ?? 0) === 0 && pcRef.current?.connectionState !== 'connected') {
            startSlowRetry('visible');
          }
        }, 1500);
      }
    }
    function onOnline() {
      startOfferBurst('online');
      setTimeout(() => {
        if ((offersReceivedRef.current ?? 0) === 0 && pcRef.current?.connectionState !== 'connected') {
          startSlowRetry('online');
        }
      }, 1500);
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

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
      
      // HARD safety net: block unsubscribe unless we explicitly allow during unmount/offline.
      // @ts-ignore
      if (!(newCh as any).__origUnsub) {
        // @ts-ignore
        (newCh as any).__origUnsub = newCh.unsubscribe.bind(newCh);
        newCh.unsubscribe = (...args: any[]) => {
          // Only allow during unmount/creator-offline where we set window.__allow_ch_teardown = true
          // @ts-ignore
          if (!(window as any).__allow_ch_teardown) {
            console.warn('[HARD-BLOCK] prevented unsubscribe on', newCh.topic, 'stack:\n', new Error().stack);
            return newCh; // NO-OP
          }
          // @ts-ignore
          return (newCh as any).__origUnsub(...args);
        };
        console.log('[HARD-BLOCK] patch applied to', newCh.topic);
      }
      
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
          setLastChannelStatus(status); // Update debug state
          
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
          
          if (status === 'SUBSCRIBED') { 
            clearTimeout(t); 
            resolve('SUBSCRIBED');
            // Start offer burst when channel becomes subscribed
            startOfferBurst('subscribed');
            // also arm slow retry to persist beyond the burst if needed
            setTimeout(() => {
              if ((offersReceivedRef.current ?? 0) === 0 && pcRef.current?.connectionState !== 'connected') {
                startSlowRetry('after-subscribed');
              }
            }, 1500);
          }
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
        ch.send({ 
          type: 'broadcast', 
          event: 'request-offer', 
          payload: { viewerId: viewerIdRef.current, ts: Date.now() } 
        });
        offerRequestCountRef.current++; // Debug counter
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
          
          // Stop the burst and slow retry when we receive an offer
          if (offerBurstRef.current?.timer) {
            clearInterval(offerBurstRef.current.timer);
          }
          stopSlowRetry('offer-received');
          
          console.log('[VIEWER] Received offer, processing...');
          
          // Resolve offer promise if waiting
          if (offerPromiseRef.current) {
            offerPromiseRef.current.resolve();
          }
          
          // payload: { sdp, viewerId }
          try {
            const pc = getOpenPc(pcRef.current?.signalingState === 'closed');
            await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channelRef.current?.send({
              type: 'broadcast',
              event: 'answer',
              payload: { viewerId: viewerIdRef.current, sdp: answer.sdp }
            });
            pc.getReceivers?.().forEach(r => r.track && addTrackOnce(r.track));
            rebindVideo();
            offersReceivedRef.current = (offersReceivedRef.current || 0) + 1;
            answersSentRef.current = (answersSentRef.current || 0) + 1;
          } catch (e) {
            console.error('[VIEWER] offer handling failed (retrying with fresh PC)', e);
            try {
              const pc = getOpenPc(true);
              await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channelRef.current?.send({
                type:'broadcast',
                event:'answer',
                payload:{ viewerId: viewerIdRef.current, sdp: answer.sdp }
              });
              pc.getReceivers?.().forEach(r => r.track && addTrackOnce(r.track));
              rebindVideo();
              offersReceivedRef.current = (offersReceivedRef.current || 0) + 1;
              answersSentRef.current = (answersSentRef.current || 0) + 1;
            } catch (e2) {
              console.error('[VIEWER] retry with fresh PC failed', e2);
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (e: any) => {
          const p = e.payload ?? e ?? {};
          const { viewerId: vid, candidate } = p;
          if (vid !== viewerIdRef.current || !candidate) return;
          
          iceRxCountRef.current++; // Debug counter
          const pc = getOpenPc();
          try { 
            await pc.addIceCandidate(candidate); 
            iceCandidateCountRef.current += 1;
            console.log(`[RTC-DEBUG] ICE candidate received (count: ${iceCandidateCountRef.current})`);
            console.log(`[VIEWER ${viewerIdRef.current}] REMOTE ICE RX`);
          } catch (err) {
            console.warn('[VIEWER', viewerIdRef.current, '] addIceCandidate failed', err);
          }
        })
        .on('broadcast', { event: 'announce-live' }, () => {
          console.log('[VIEWER] Received announce-live, starting offer burst');
          lastAnnounceTsRef.current = Date.now();
          startOfferBurst('announce-live');  // fast immediately
          // also arm slow retry to persist beyond the burst if needed
          setTimeout(() => {
            if ((offersReceivedRef.current ?? 0) === 0 && pcRef.current?.connectionState !== 'connected') {
              startSlowRetry('after-announce');
            }
          }, 2000);
        })
        .on('broadcast', { event: 'offer-retry' }, ({ payload }) => {
          const { viewerId } = payload || {};
          if (viewerId === viewerIdRef.current && channelRef.current) {
            console.log('[VIEWER] Received offer-retry, requesting offer');
            channelRef.current.send({
              type: 'broadcast',
              event: 'request-offer',
              payload: { viewerId: viewerIdRef.current }
            });
            offerRequestCountRef.current++;
          }
        })
        .on('broadcast', { event: 'pong' }, () => { 
          pongCountRef.current++; 
        })
        .on('broadcast', { event: 'creator-offline' }, (e: any) => {
          console.log(`[VIEWER ${viewerIdRef.current}] Creator went offline`);
          setConnectionState('offline');
          // Allow teardown ONLY for explicit creator-offline
          console.log('[VIEWER', viewerIdRef.current, '] removeChannel attempted for creator-offline', channelRef.current?.topic);
          runWithTeardownAllowed(() => {
            try { channelRef.current?.unsubscribe?.(); } catch {}
            try { supabase.removeChannel(channelRef.current!); } catch {}
            try { fallbackChannelRef.current?.unsubscribe?.(); } catch {}
            try { supabase.removeChannel(fallbackChannelRef.current!); } catch {}
          });
          try { pcRef.current?.close(); pcRef.current = null; } catch {}
        });
    };

    const connectToCreatorBroadcast = async () => {
      // SFU path (bypass legacy P2P)
      if (USE_SFU) {
        hudLog("[SFU] start");
        try {
          const sfu = createSFU();
          
          // Hook remote track into existing video element
          sfu.onRemoteVideo((el) => {
            console.log("[SFU] remote video attached");
            // Replace the element's srcObject
            if (videoRef.current) {
              // Easiest: swap nodes
              const parent = videoRef.current.parentElement;
              if (parent) {
                el.className = videoRef.current.className;
                parent.replaceChild(el, videoRef.current);
                // @ts-ignore
                videoRef.current = el;
              }
            }
          });
          
          // Identity and creatorId  
          const { data } = await supabase.auth.getUser();
          const body = { role: "viewer" as const, creatorId: resolvedCreatorId || queueId, identity: data?.user?.id || crypto.randomUUID() };
          hudLog("[SFU] POST token", TOKEN_URL, JSON.stringify(body));

          const resp = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          hudLog("[SFU] token resp", String(resp.status));
          const json = await resp.json().catch(e => ({ error: "bad-json " + String(e) }));
          hudLog("[SFU] token json", JSON.stringify(json));

          if (!resp.ok || json.error) throw new Error(json.error || ("HTTP " + resp.status));

          await sfu.connect(json.host, json.token);
          hudLog("[SFU] connected");
          
          setConnectionState('connected');
          console.log('[VIEWER] SFU connected successfully');
          
          // Store cleanup function for unmount
          (window as any).__viewerSFU = sfu;
          
          return; // stop legacy P2P setup
        } catch (e) {
          hudError("SFU", e);
          setConnectionState('failed');
          return;
        }
      }

      try {
        const viewerId = viewerIdRef.current;
        console.log(`[BROADCAST_VIEWER:${viewerId}] Starting connection attempt`, retryCount + 1);
        setConnectionState('connecting');
        
        // Ensure we have an open peer connection (creates fresh if needed)
        const peerConnection = getOpenPc();

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
              console.log('[VIEWER', viewerId, '] removeChannel attempted for debug channel', dbg.topic);
              runWithTeardownAllowed(() => {
                try { dbg.unsubscribe?.(); } catch {}
                try { supabase.removeChannel(dbg); } catch {}
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

  // Add visibility change handler for offer burst and video rebind
  useEffect(() => {
    const onVis = () => { 
      if (document.visibilityState === 'visible') {
        rebindVideo();
        // Start offer burst when tab becomes visible if not connected
        if (connectionState !== 'connected') {
          console.log('[VIEWER] Tab became visible, starting offer burst');
          startOfferBurst('visible');
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [connectionState]);

  // Ensure video is always mounted and bound to the persistent stream
  useEffect(() => {
    if (videoRef.current) rebindVideo(videoRef.current);
  }, []);

  // UNMOUNT-only cleanup effect
  useEffect(() => {
    return () => {
      console.log('[VIEWER', viewerIdRef.current, '] removeChannel attempted for', channelRef.current?.topic);
      
      // Cleanup SFU on unmount
      if (USE_SFU && (window as any).__viewerSFU) {
        try {
          (window as any).__viewerSFU.disconnect();
          (window as any).__viewerSFU = null;
        } catch (e) {
          console.error('[VIEWER] SFU cleanup error', e);
        }
      }
      
      runWithTeardownAllowed(() => {
        try { channelRef.current?.unsubscribe?.(); } catch {}
        try { supabase.removeChannel(channelRef.current!); } catch {}
        try { fallbackChannelRef.current?.unsubscribe?.(); } catch {}
        try { supabase.removeChannel(fallbackChannelRef.current!); } catch {}
        try { pcRef.current?.close?.(); } catch {}
      });
    };
  }, []);

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
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          // Ensure video starts muted for autoplay policies
          if (videoRef.current) {
            videoRef.current.muted = true;
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

          {/* Tap to play overlay if video is paused */}
          {videoRef.current?.paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Button
                onClick={() => { 
                  try { videoRef.current?.play?.(); } catch {} 
                }}
                size="lg"
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Tap to Play
              </Button>
            </div>
          )}

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

      {DEBUG && <InlineHUD />}

    </div>
  );
}