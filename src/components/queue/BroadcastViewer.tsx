import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
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

export function BroadcastViewer({ creatorId, sessionId }: BroadcastViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  // WebRTC connection for receiving broadcast
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let peerConnection: RTCPeerConnection | null = null;
    let signalChannel: any = null;

    const connectToCreatorBroadcast = async () => {
      try {
        console.log('[BROADCAST_VIEWER] Setting up WebRTC connection');
        
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
            setIsConnected(true);
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
      }
    };

    connectToCreatorBroadcast();

    // Cleanup
    return () => {
      console.log('[BROADCAST_VIEWER] Cleaning up WebRTC connection');
      if (peerConnection) {
        peerConnection.close();
      }
      if (signalChannel) {
        supabase.removeChannel(signalChannel);
      }
      if (video) {
        video.srcObject = null;
      }
      setIsConnected(false);
    };
  }, [creatorId, sessionId]);

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

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {isConnected ? (
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
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Connecting to broadcast...</p>
          </div>
        </div>
      )}

    </div>
  );
}