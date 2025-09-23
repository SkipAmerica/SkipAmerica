import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mic, MicOff, Camera, CameraOff, Wifi, RotateCcw, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'

interface LobbyBroadcastPanelProps {
  onEnd: () => void
}

interface ChatMessage {
  id: string
  user_id: string
  message: string
  created_at: string
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
}

interface MediaState {
  stream: MediaStream | null
  error: string | null
  loading: boolean
  audioEnabled: boolean
  videoEnabled: boolean
  retryCount: number
}

export function LobbyBroadcastPanel({ onEnd }: LobbyBroadcastPanelProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const chatOverlayRef = useRef<HTMLDivElement>(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  
  const [mediaState, setMediaState] = useState<MediaState>({
    stream: null,
    error: null,
    loading: true,
    audioEnabled: true,
    videoEnabled: true,
    retryCount: 0
  })

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!user) return

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('lobby_chat_messages')
        .select(`
          id,
          user_id,
          message,
          created_at
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (messagesError) {
        console.error('Error fetching lobby messages:', messagesError)
        return
      }

      // Fetch profiles separately
      if (messagesData && messagesData.length > 0) {
        const userIds = [...new Set(messagesData.map(msg => msg.user_id))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds)

        const messagesWithProfiles = messagesData.map(msg => ({
          ...msg,
          profiles: profilesData?.find(p => p.id === msg.user_id)
        }))

        setMessages(messagesWithProfiles)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [user])

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('lobby-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lobby_chat_messages',
          filter: `creator_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single()

          const newMessage = {
            ...payload.new,
            profiles: profile
          } as ChatMessage

          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const initMedia = useCallback(async () => {
    setMediaState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: { 
          echoCancellation: true,
          noiseSuppression: true 
        }
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setMediaState(prev => ({
        ...prev,
        stream,
        loading: false,
        error: null,
        retryCount: 0
      }))

      // Log telemetry
      console.info('[LOBBY_BROADCAST] Started', {
        audio: stream.getAudioTracks().length > 0,
        video: stream.getVideoTracks().length > 0
      })

      // Fetch existing messages
      fetchMessages()

    } catch (error: any) {
      console.error('[LOBBY_BROADCAST] Error:', error)
      
      let errorMessage = 'Couldn\'t start broadcast preview — retry.'
      
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        errorMessage = 'Permission needed — enable camera & mic and try again.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another app.'
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        errorMessage = 'No usable camera/microphone found.'
      }

      setMediaState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }))

      // Log telemetry
      console.info('[LOBBY_BROADCAST] Error', { code: error.name })

      // Auto-retry with exponential backoff (max 2 retries)
      if (mediaState.retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, mediaState.retryCount), 4000)
        retryTimeoutRef.current = setTimeout(() => {
          initMedia()
    }, delay)
      }
    }
  }, [mediaState.retryCount, fetchMessages])

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      const newEnabled = !mediaState.audioEnabled
      audioTracks.forEach(track => {
        track.enabled = newEnabled
      })
      setMediaState(prev => ({ ...prev, audioEnabled: newEnabled }))
    }
  }, [mediaState.audioEnabled])

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks()
      const newEnabled = !mediaState.videoEnabled
      videoTracks.forEach(track => {
        track.enabled = newEnabled
      })
      setMediaState(prev => ({ ...prev, videoEnabled: newEnabled }))
    }
  }, [mediaState.videoEnabled])

  const handleEnd = useCallback(() => {
    console.info('[LOBBY_BROADCAST] End clicked')
    cleanup()
    onEnd()
  }, [cleanup, onEnd])

  const handleRetry = useCallback(() => {
    if (mediaState.retryCount < 3) {
      initMedia()
    }
  }, [initMedia, mediaState.retryCount])

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sending || !user) return

    setSending(true)

    try {
      const { error } = await supabase
        .from('lobby_chat_messages')
        .insert({
          creator_id: user.id,
          user_id: user.id,
          message: chatInput.trim()
        })

      if (error) {
        console.error('Error sending message:', error)
        toast({
          title: "Failed to send message",
          description: error.message,
          variant: "destructive"
        })
        return
      }

      setChatInput('')
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }, [chatInput, sending, user, toast])

  // Auto-scroll chat overlay to bottom on new messages
  useEffect(() => {
    if (chatOverlayRef.current) {
      const element = chatOverlayRef.current
      
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        const isScrolledToBottom = element.scrollTop >= element.scrollHeight - element.clientHeight - 15
        if (isScrolledToBottom || messages.length === 1) {
          element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
          })
        }
      })
    }
  }, [messages])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // WebRTC broadcasting to viewers
  useEffect(() => {
    if (!user || !streamRef.current) return;

    let peerConnections: Map<string, RTCPeerConnection> = new Map();
    let signalChannel: any = null;

    const setupBroadcasting = async () => {
      try {
        console.log('[LOBBY_BROADCAST] Setting up WebRTC broadcasting');
        
        // Set up signaling channel
        signalChannel = supabase.channel(`broadcast:${user.id}`)
          .on('broadcast', { event: 'answer' }, async (payload) => {
            console.log('[LOBBY_BROADCAST] Received answer from viewer');
            // In a real implementation, we'd handle multiple viewers
            // For now, we'll create a single connection
            const viewerId = 'viewer'; // In reality, this would be unique per viewer
            const pc = peerConnections.get(viewerId);
            if (pc && payload.sender === 'viewer') {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              } catch (error) {
                console.error('[LOBBY_BROADCAST] Error setting remote description:', error);
              }
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
            if (payload.sender === 'viewer') {
              console.log('[LOBBY_BROADCAST] Received ICE candidate from viewer');
              const viewerId = 'viewer';
              const pc = peerConnections.get(viewerId);
              if (pc && pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (error) {
                  console.error('[LOBBY_BROADCAST] Error adding ICE candidate:', error);
                }
              }
            }
          })
          .subscribe();

        // Create offer for viewers (simplified - in reality you'd do this per viewer)
        const createOfferForViewer = async () => {
          const viewerId = 'viewer';
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          });

          peerConnections.set(viewerId, pc);

          // Add local stream tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, streamRef.current!);
            });
          }

          // Handle ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate && signalChannel) {
              console.log('[LOBBY_BROADCAST] Sending ICE candidate to viewers');
              signalChannel.send({
                type: 'broadcast',
                event: 'ice-candidate',
                candidate: event.candidate,
                sender: 'creator'
              });
            }
          };

          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          console.log('[LOBBY_BROADCAST] Sending offer to viewers');
          signalChannel.send({
            type: 'broadcast',
            event: 'offer',
            offer: offer,
            sender: 'creator'
          });
        };

        // Wait a bit for the channel to be ready, then create offer
        setTimeout(createOfferForViewer, 1000);

      } catch (error) {
        console.error('[LOBBY_BROADCAST] Error setting up broadcasting:', error);
      }
    };

    setupBroadcasting();

    // Cleanup
    return () => {
      console.log('[LOBBY_BROADCAST] Cleaning up WebRTC broadcasting');
      peerConnections.forEach(pc => pc.close());
      if (signalChannel) {
        supabase.removeChannel(signalChannel);
      }
    };
  }, [user, mediaState.stream]);

  // Initialize media on mount
  useEffect(() => {
    initMedia()
    return cleanup
  }, [initMedia, cleanup])

  return (
    <div 
      className="w-full mb-4" 
      role="region" 
      aria-label="Lobby Broadcast"
    >
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-neutral-900">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Loading Overlay */}
        {mediaState.loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              <span>Starting broadcast preview...</span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {mediaState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 p-4">
            <div className="text-center">
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{mediaState.error}</AlertDescription>
              </Alert>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={mediaState.loading || mediaState.retryCount >= 3}
                className="text-xs"
              >
                <RotateCcw className={cn("h-3 w-3 mr-1", mediaState.loading && "animate-spin")} />
                {mediaState.retryCount >= 3 ? 'Max Retries' : 'Retry'}
              </Button>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {!mediaState.loading && !mediaState.error && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center justify-between">
              {/* Media Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={mediaState.audioEnabled ? "secondary" : "destructive"}
                  onClick={toggleAudio}
                  className="h-8 w-8 p-0"
                  aria-label="Toggle microphone"
                  aria-pressed={mediaState.audioEnabled}
                >
                  {mediaState.audioEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant={mediaState.videoEnabled ? "secondary" : "destructive"}
                  onClick={toggleVideo}
                  className="h-8 w-8 p-0"
                  aria-label="Toggle camera"
                  aria-pressed={mediaState.videoEnabled}
                >
                  {mediaState.videoEnabled ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <CameraOff className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex items-center gap-1 text-white text-xs">
                  <Wifi className="h-3 w-3" />
                  <span>Live Preview</span>
                </div>
              </div>

              {/* End Broadcast Button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEnd}
                aria-label="End broadcast"
              >
                End Broadcast
              </Button>
            </div>
          </div>
        )}

        {/* Chat Overlay */}
        {!mediaState.loading && !mediaState.error && (
          <div 
            ref={chatOverlayRef}
            className="absolute bottom-16 left-2 right-2 flex flex-col space-y-1 overflow-hidden text-xs text-white max-h-32 overflow-y-auto scrollbar-hide"
            role="log" 
            aria-live="polite"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)'
            }}
          >
            {messages.map((message) => (
              <div 
                key={message.id}
                className="bg-black/40 px-2 py-1 rounded text-white drop-shadow-sm flex items-center gap-2"
              >
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="bg-primary/20 text-xs">
                    {message.profiles?.full_name 
                      ? getInitials(message.profiles.full_name)
                      : 'U'
                    }
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {message.user_id === user?.id ? 'You' : message.profiles?.full_name || 'User'}:
                </span> 
                {message.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="w-full mt-2 flex items-center border rounded-full px-3 py-2 text-sm bg-white shadow">
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Say something to the lobby…"
          className="flex-1 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Send chat message to lobby"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={!chatInput.trim() || sending}
          className="h-6 w-6 p-0 ml-2"
        >
          <Send className="h-3 w-3" />
        </Button>
      </form>
    </div>
  )
}