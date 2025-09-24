import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mediaManager } from '@/media/MediaOrchestrator';
import { generateViewerId } from '@/utils/viewer-id';
import { resolveCreatorUserId, canonicalChannelFor, legacyQueueChannelFor } from '@/lib/queueResolver';
import { isQueueFallbackEnabled } from '@/lib/env';

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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

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
    const channel = supabase
      .channel('broadcast-chat-messages')
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

    return () => {
      supabase.removeChannel(channel);
    };
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
    const resolvedChannel = supabase
      .channel(`broadcast-live-session-${resolvedId}`)
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
      const rawChannel = supabase
        .channel(`broadcast-live-session-${queueId}`)
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
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [queueId, resolvedCreatorId]);

  // Continuous monitoring with polling backup (wait for resolution)
  useEffect(() => {
    if (!queueId || resolvedCreatorId === undefined) return;

    const pollInterval = setInterval(async () => {
      if (connectionState === 'connected') return; // Don't poll if already connected
      
      const isBroadcasting = await checkCreatorBroadcastStatus();
      
      if (isBroadcasting && (connectionState === 'offline' || connectionState === 'failed')) {
        console.log('[BROADCAST_VIEWER] Polling detected creator is broadcasting - reconnecting');
        setConnectionState('checking');
      } else if (!isBroadcasting && connectionState !== 'offline') {
        console.log('[BROADCAST_VIEWER] Polling detected creator stopped broadcasting');
        setConnectionState('offline');
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [queueId, resolvedCreatorId, connectionState]);

  // Resolve queueId to creator_user_id on mount
  useEffect(() => {
    const resolveCreator = async () => {
      if (!queueId) return;
      
      console.log(`[QUEUE_RESOLVER] Resolving queueId: ${queueId}`);
      const creatorUserId = await resolveCreatorUserId(queueId);
      console.log(`[QUEUE_RESOLVER] Resolved:`, creatorUserId ? `creator_user_id=${creatorUserId}` : 'no mapping');
      
      setResolvedCreatorId(creatorUserId);
    };
    
    resolveCreator();
  }, [queueId]);

  // WebRTC connection management
  useEffect(() => {
    if (resolvedCreatorId === undefined) return;

    let peerConnection: RTCPeerConnection | null = null;
    let signalChannel: any = null;
    let connectionHealthCheck: NodeJS.Timeout | null = null;

    const connectToCreatorBroadcast = async () => {
      try {
        const viewerId = viewerIdRef.current;
        console.log(`[BROADCAST_VIEWER:${viewerId}] Starting connection attempt`, retryCount + 1);
        setConnectionState('connecting');
        
        // Create peer connection
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = peerConnection;

        // Handle incoming remote stream
        peerConnection.ontrack = (event) => {
          console.log(`[BROADCAST_VIEWER:${viewerId}] Received remote stream`);
          const [remoteStream] = event.streams;
          const video = videoRef.current;
          if (video && remoteStream) {
            video.srcObject = remoteStream;
            setConnectionState('connected');
            setRetryCount(0); // Reset retry count on successful connection
            setOfferRetryCount(0); // Reset offer retry count
            
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            
            // Start connection health monitoring
            connectionHealthCheck = setInterval(async () => {
              const isStillBroadcasting = await checkCreatorBroadcastStatus();
              if (!isStillBroadcasting) {
                console.log(`[BROADCAST_VIEWER:${viewerId}] Health check: Creator stopped broadcasting`);
                setConnectionState('offline');
                cleanup();
              }
            }, 15000); // Check every 15 seconds
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(`[BROADCAST_VIEWER:${viewerId}] Connection state:`, peerConnection?.connectionState);
          if (peerConnection?.connectionState === 'failed' || peerConnection?.connectionState === 'disconnected') {
            setConnectionState('failed');
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate && signalChannel) {
            iceCandidateCountRef.current += 1;
            console.log(`[RTC-DEBUG] ICE candidate generated locally (count: ${iceCandidateCountRef.current})`);
            console.log(`[VIEWER ${viewerId}] LOCAL ICE TX`);
            signalChannel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { viewerId, candidate: event.candidate }
            });
          }
        };

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

        // Helper to normalize both payload shapes
        const fromSignal = (e: any) => {
          const p = e?.payload ?? e ?? {};
          return {
            viewerId: p.viewerId,
            sdp: p.sdp,
            candidate: p.candidate
          };
        };

        // Ensure viewer PeerConnection setup
        const ensureViewerPc = () => {
          if (!peerConnection) {
            console.error(`[BROADCAST_VIEWER:${viewerId}] PeerConnection not initialized`);
            setConnectionState('failed');
            return false;
          }
          return true;
        };

        // Set up signaling channel with request/response handshake
        signalChannel = supabase.channel(channelToUse)
          .on('broadcast', { event: 'offer' }, async (e) => {
            const { viewerId: vid, sdp } = fromSignal(e);
            if (!vid || vid !== viewerId) return;
            
            const channelTypeUsed = usingFallback ? 'fallback' : 'primary';
            console.log(`[VIEWER ${viewerId}] OFFER RX via ${channelTypeUsed} (payload=${!!e?.payload})`);
            
            if (!ensureViewerPc()) return;
            
            try {
              await peerConnection!.setRemoteDescription({ type: 'offer', sdp });
              console.log(`[VIEWER ${viewerId}] Remote description set, SDP len=${sdp?.length || 0}`);
              
              const answer = await peerConnection!.createAnswer();
              await peerConnection!.setLocalDescription(answer);
              
              signalChannel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { viewerId, sdp: answer.sdp }
              });
              
              console.log(`[VIEWER ${viewerId}] ANSWER TX len=${answer.sdp.length}`);
            } catch (error) {
              console.error(`[BROADCAST_VIEWER:${viewerId}] Error handling offer:`, error);
              setConnectionState('failed');
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async (e) => {
            const { viewerId: vid, candidate } = fromSignal(e);
            if (!vid || vid !== viewerId || !candidate) return;
            
            if (!ensureViewerPc()) return;
            if (!peerConnection!.remoteDescription) return;
            
            try {
              await peerConnection!.addIceCandidate(candidate);
              iceCandidateCountRef.current += 1;
              console.log(`[RTC-DEBUG] ICE candidate received (count: ${iceCandidateCountRef.current})`);
              console.log(`[VIEWER ${viewerId}] REMOTE ICE RX`);
            } catch (error) {
              console.error(`[BROADCAST_VIEWER:${viewerId}] Error adding ICE candidate:`, error);
            }
          })
          .on('broadcast', { event: 'creator-offline' }, (e) => {
            const { /* viewerId unused here */ } = fromSignal(e);
            console.log(`[VIEWER ${viewerId}] Creator went offline`);
            setConnectionState('offline');
          })
          .subscribe((status) => {
            console.log(`[BROADCAST_VIEWER:${viewerId}] Channel subscription status:`, status);
            
            // Only send request-offer after successful subscription
            if (status === 'SUBSCRIBED') {
              const channelTypeUsed = usingFallback ? 'fallback' : 'primary';
              console.log(`[VIEWER ${viewerId}] SUBSCRIBED to ${channelTypeUsed} channel: ${channelToUse}`);
              
              signalChannel.send({
                type: 'broadcast',
                event: 'request-offer',
                payload: { viewerId }
              });
              
              console.log(`[VIEWER ${viewerId}] REQUEST-OFFER TX`);
              
              // Set up offer timeout with retry logic
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
              }
              
              connectionTimeoutRef.current = setTimeout(() => {
                console.log(`[BROADCAST_VIEWER:${viewerIdRef.current}] No offer received, retrying...`);
                handleOfferRetry();
              }, 5000); // 5 second timeout for offer
            }
          });

        console.log(`[BROADCAST_VIEWER:${viewerIdRef.current}] WebRTC setup complete, waiting for subscription`);

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
        if (signalChannel) {
          signalChannel.send({
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
      console.log('[BROADCAST_VIEWER] Cleaning up WebRTC connection');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (connectionHealthCheck) {
        clearInterval(connectionHealthCheck);
        connectionHealthCheck = null;
      }
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        peerConnectionRef.current = null;
      }
      if (signalChannel) {
        supabase.removeChannel(signalChannel);
        signalChannel = null;
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

      // Cleanup any existing connection first
      cleanup();

      // Check if creator is currently broadcasting - but don't hard-block on unknown status
      const isBroadcasting = await checkCreatorBroadcastStatus();
      
      if (!isBroadcasting && resolvedCreatorId) {
        // Only block if we successfully resolved the creator ID and they're definitely offline
        console.log('[BROADCAST_VIEWER] Creator is not broadcasting, setting offline and will retry...');
        setConnectionState('offline');
        return;
      } else if (!isBroadcasting) {
        console.log('[BROADCAST_VIEWER] Could not verify broadcast status (unknown creator mapping), proceeding with connection attempt...');
      }

      // Proceed with WebRTC connection
      await connectToCreatorBroadcast();
    };

    // Setup debug stats monitoring if debug=1 is in URL
    const isDebugMode = window.location.search.includes('debug=1');
    if (isDebugMode && !debugIntervalRef.current) {
      debugIntervalRef.current = setInterval(() => {
        if (peerConnectionRef.current) {
          const video = videoRef.current;
          const videoResolution = video && video.videoWidth && video.videoHeight 
            ? `${video.videoWidth}x${video.videoHeight}` 
            : '0x0';
          
          const remoteStreams = video?.srcObject ? (video.srcObject as MediaStream).getTracks().length : 0;
          
          setDebugStats({
            signalingState: peerConnectionRef.current.signalingState,
            iceConnectionState: peerConnectionRef.current.iceConnectionState,
            connectionState: peerConnectionRef.current.connectionState,
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

    // Cleanup when component unmounts or dependencies change
    return () => {
      cleanup();
    };
  }, [resolvedCreatorId, connectionState, retryCount]);

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
    if (!peerConnectionRef.current) return;
    
    try {
      const stats = await peerConnectionRef.current.getStats();
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

      {/* Debug Overlay - Viewer (bottom-right) */}
      {window.location.search.includes('debug=1') && (
        <div 
          className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-[9999] max-w-xs"
          style={{ fontFamily: 'monospace' }}
        >
          <div className="font-bold mb-1">VIEWER [{viewerIdRef.current.slice(-6)}]</div>
          <div>Signal: {debugStats.signalingState}</div>
          <div>ICE: {debugStats.iceConnectionState}</div>
          <div>Conn: {debugStats.connectionState}</div>
          <div>Tracks: {debugStats.remoteTrackCount}</div>
          <div>Video: {debugStats.videoResolution}</div>
          <div>ICE Candidates: {debugStats.iceCandidateCount}</div>
          <Button
            onClick={handleDumpStats}
            size="sm"
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-6 px-2"
          >
            Dump Stats
          </Button>
        </div>
      )}
    </div>
  );
}