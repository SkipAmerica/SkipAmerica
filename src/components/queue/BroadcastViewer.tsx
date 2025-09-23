import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mediaManager } from '@/media/MediaOrchestrator';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Check if creator is broadcasting before attempting connection
  const checkCreatorBroadcastStatus = async (): Promise<boolean> => {
    try {
      console.log('[BROADCAST_VIEWER] Checking if creator is broadcasting:', creatorId);
      
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('creator_id', creatorId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isBroadcasting = !!liveSession;
      console.log('[BROADCAST_VIEWER] Creator broadcasting status:', isBroadcasting);
      
      return isBroadcasting;
    } catch (error) {
      console.error('[BROADCAST_VIEWER] Error checking broadcast status:', error);
      return false;
    }
  };

  // Fetch lobby chat messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: messagesData } = await supabase
          .from('lobby_chat_messages')
          .select('id, user_id, message, created_at')
          .eq('creator_id', creatorId)
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
          filter: `creator_id=eq.${creatorId}`
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
  }, [creatorId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Real-time subscription to live session changes
  useEffect(() => {
    if (!creatorId) return;

    console.log('[BROADCAST_VIEWER] Setting up live session subscription for creator:', creatorId);

    // Subscribe to live session changes for this creator
    const liveSessionChannel = supabase
      .channel(`broadcast-live-session-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'live_sessions',
          filter: `creator_id=eq.${creatorId}`
        },
        (payload) => {
          console.log('[BROADCAST_VIEWER] Live session change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Creator just went live
            console.log('[BROADCAST_VIEWER] Creator went live - attempting connection');
            setRetryCount(0); // Reset retry count for new session
            setConnectionState('checking');
          } else if (payload.eventType === 'UPDATE' && payload.new.ended_at) {
            // Creator stopped broadcasting
            console.log('[BROADCAST_VIEWER] Creator stopped broadcasting');
            setConnectionState('offline');
          } else if (payload.eventType === 'DELETE') {
            // Session was deleted
            console.log('[BROADCAST_VIEWER] Live session deleted');
            setConnectionState('offline');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liveSessionChannel);
    };
  }, [creatorId]);

  // Continuous monitoring with polling backup
  useEffect(() => {
    if (!creatorId) return;

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
  }, [creatorId, connectionState]);

  // WebRTC connection management
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let peerConnection: RTCPeerConnection | null = null;
    let signalChannel: any = null;
    let connectionHealthCheck: NodeJS.Timeout | null = null;

    const connectToCreatorBroadcast = async () => {
      try {
        console.log('[BROADCAST_VIEWER] Starting connection attempt', retryCount + 1);
        setConnectionState('connecting');
        
        // Set connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
          console.log('[BROADCAST_VIEWER] Connection timeout reached');
          setConnectionState('failed');
          cleanup();
        }, 10000); // 10 second timeout
        
        // Create peer connection
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        // Handle incoming remote stream
        peerConnection.ontrack = (event) => {
          console.log('[BROADCAST_VIEWER] Received remote stream');
          const [remoteStream] = event.streams;
          if (video && remoteStream) {
            video.srcObject = remoteStream;
            setConnectionState('connected');
            setRetryCount(0); // Reset retry count on successful connection
            
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            
            // Start connection health monitoring
            connectionHealthCheck = setInterval(async () => {
              const isStillBroadcasting = await checkCreatorBroadcastStatus();
              if (!isStillBroadcasting) {
                console.log('[BROADCAST_VIEWER] Health check: Creator stopped broadcasting');
                setConnectionState('offline');
                cleanup();
              }
            }, 15000); // Check every 15 seconds
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log('[BROADCAST_VIEWER] Connection state:', peerConnection?.connectionState);
          if (peerConnection?.connectionState === 'failed' || peerConnection?.connectionState === 'disconnected') {
            setConnectionState('failed');
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate && signalChannel) {
            console.log('[BROADCAST_VIEWER] Sending ICE candidate');
            signalChannel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              candidate: event.candidate,
              sender: 'viewer'
            });
          }
        };

        // Set up signaling channel
        signalChannel = supabase.channel(`broadcast:${creatorId}`)
          .on('broadcast', { event: 'offer' }, async (payload) => {
            console.log('[BROADCAST_VIEWER] Received offer from creator');
            try {
              await peerConnection!.setRemoteDescription(new RTCSessionDescription(payload.offer));
              
              const answer = await peerConnection!.createAnswer();
              await peerConnection!.setLocalDescription(answer);
              
              signalChannel.send({
                type: 'broadcast',
                event: 'answer',
                answer: answer,
                sender: 'viewer'
              });
            } catch (error) {
              console.error('[BROADCAST_VIEWER] Error handling offer:', error);
              setConnectionState('failed');
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            if (payload.sender === 'creator' && peerConnection && peerConnection.remoteDescription) {
              console.log('[BROADCAST_VIEWER] Received ICE candidate from creator');
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (error) {
                console.error('[BROADCAST_VIEWER] Error adding ICE candidate:', error);
              }
            }
          })
          .subscribe();

        console.log('[BROADCAST_VIEWER] WebRTC setup complete, waiting for creator offer');

      } catch (error) {
        console.error('[BROADCAST_VIEWER] Error setting up WebRTC:', error);
        setConnectionState('failed');
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
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }
      if (signalChannel) {
        supabase.removeChannel(signalChannel);
        signalChannel = null;
      }
      if (video) {
        video.srcObject = null;
      }
    };

    const initConnection = async () => {
      // Only attempt connection in 'checking' or 'retry' state
      if (connectionState !== 'checking' && connectionState !== 'retry') {
        return;
      }

      // Cleanup any existing connection first
      cleanup();

      // Check if creator is currently broadcasting
      const isBroadcasting = await checkCreatorBroadcastStatus();
      
      if (!isBroadcasting) {
        console.log('[BROADCAST_VIEWER] Creator is not broadcasting');
        setConnectionState('offline');
        return;
      }

      // Proceed with WebRTC connection
      await connectToCreatorBroadcast();
    };

    // Initialize connection when in appropriate states
    if (connectionState === 'checking' || connectionState === 'retry') {
      initConnection();
    }

    // Cleanup when component unmounts or creatorId changes
    return () => {
      cleanup();
    };
  }, [creatorId, sessionId, connectionState, retryCount]);

  const handleRetry = async () => {
    console.log('[BROADCAST_VIEWER] Manual retry triggered');
    const maxRetries = 5;
    
    if (retryCount >= maxRetries) {
      console.log('[BROADCAST_VIEWER] Max retries reached, showing offline');
      setConnectionState('offline');
      return;
    }
    
    setRetryCount(prev => prev + 1);
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
      {connectionState === 'connected' ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
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
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {renderConnectionState()}
        </div>
      )}
    </div>
  );
}