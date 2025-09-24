import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mic, MicOff, Camera, CameraOff, Wifi, RotateCcw, Send, Square, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { canonicalSignalChannel } from '@/lib/queueResolver'
import { createSFU } from '@/lib/sfu'

const TOKEN_URL = "https://ytqkunjxhtjsbpdrwsjf.functions.supabase.co/get_livekit_token";

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
  currentSession: any | null
  isStreaming: boolean
}

export function LobbyBroadcastPanel({ onEnd }: LobbyBroadcastPanelProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const USE_SFU = true // Feature flag for LiveKit SFU
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const chatOverlayRef = useRef<HTMLDivElement>(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [debugStats, setDebugStats] = useState({
    signalingState: 'stable',
    iceConnectionState: 'closed',
    connectionState: 'closed',
    localTrackCount: 0,
    iceCandidateCount: 0
  });
  const debugIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidateCountRef = useRef(0);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  
  const [mediaState, setMediaState] = useState<MediaState>({
    stream: null,
    error: null,
    loading: true,
    audioEnabled: true,
    videoEnabled: true,
    retryCount: 0,
    currentSession: null,
    isStreaming: false
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
    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current)
      debugIntervalRef.current = null
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
      if ((window as any).__allow_ch_teardown) {
        try { supabase.removeChannel(channel); } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
    }
  }, [user])

  // WebRTC signaling setup - moved here to be available before broadcast starts
  const signalingChannelRef = useRef<any>(null);
  const waitingViewersRef = useRef<Set<string>>(new Set());
  const proactiveOfferTimeoutRef = useRef<NodeJS.Timeout>();

  const setupSignalingChannel = useCallback(async () => {
    if (!user || signalingChannelRef.current) return signalingChannelRef.current;

    const creatorUserId = user.id;
    const canonicalChannel = canonicalSignalChannel(creatorUserId);
    console.log('[CREATOR] Setting up signaling channel:', canonicalChannel);
    
    // Get ICE servers configuration
    const iceServers = (() => {
      try {
        return JSON.parse(import.meta.env.VITE_ICE_SERVERS || '[]');
      } catch {
        return [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ];
      }
    })();

    // Helper to create peer connection for a viewer
    const createPeerForViewer = (viewerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'all' });
      peerConnectionsRef.current.set(viewerId, pc);

      // Add local stream tracks if available
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, streamRef.current!);
        });
      }

      // Handle ICE candidates for this viewer
      pc.onicecandidate = (event) => {
        if (event.candidate && signalingChannelRef.current) {
          iceCandidateCountRef.current += 1;
          console.log(`[CREATOR] Sending ICE candidate to viewer ${viewerId}`);
          signalingChannelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { viewerId, candidate: event.candidate }
          });
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log(`[CREATOR] Viewer ${viewerId} connection state:`, pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setTimeout(() => {
            pc.close();
            peerConnectionsRef.current.delete(viewerId);
          }, 1000);
        }
      };

      return pc;
    };

    // Issue offer to a specific viewer
    const issueOffer = async (viewerId: string) => {
      console.log(`[CREATOR] Issuing offer to viewer ${viewerId}`);
      
      try {
        // Get or create peer connection for this viewer
        let pc = peerConnectionsRef.current.get(viewerId);
        if (!pc) {
          pc = createPeerForViewer(viewerId);
        }

        // Create and send offer
        const offer = await pc.createOffer({ 
          offerToReceiveAudio: true, 
          offerToReceiveVideo: true 
        });
        await pc.setLocalDescription(offer);
        
        console.log('[CREATOR] Sending offer to viewer', viewerId);
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: { viewerId, sdp: offer.sdp }
        });
      } catch (error) {
        console.error(`[CREATOR] Error creating offer for viewer ${viewerId}:`, error);
      }
    };

    // Helper function to extract viewerId from various payload shapes
    function getViewerId(msg: any) {
      return msg?.viewerId ?? msg?.payload?.viewerId ?? msg?.data?.viewerId ?? msg?.record?.viewerId ?? null;
    }

    // Helper function to extract viewerId from various payload shapes
    function extractViewerId(m: any) {
      return m?.payload?.viewerId ?? m?.viewerId ?? m?.data?.viewerId ?? m?.record?.viewerId ?? null;
    }

    // Set up signaling channel with handlers
    const channel = supabase.channel(canonicalChannel)
      .on('system', { event: 'phx_reply' }, (m) => 
        console.log('[CREATOR] system phx_reply:', m))
      .on('broadcast', { event: 'request-offer' }, async (m: any) => {
        const viewerId = extractViewerId(m);
        console.log('[CREATOR] request-offer received', { viewerId, m });
        if (!viewerId) return;
        
        waitingViewersRef.current.add(viewerId);
        await issueOffer(viewerId);
      })
      .on('broadcast', { event: 'ping' }, (m: any) => {
        const viewerId = extractViewerId(m);
        if (!viewerId) return;
        console.log('[CREATOR] ping received from viewer', viewerId);
        signalingChannelRef.current?.send({ 
          type: 'broadcast', 
          event: 'pong', 
          payload: { viewerId, ts: Date.now() } 
        });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        const { viewerId, sdp } = payload || {};
        if (!viewerId || !sdp) return;
        
        console.log(`[CREATOR] Received answer from viewer ${viewerId}`);
        const pc = peerConnectionsRef.current.get(viewerId);
        if (!pc) return;
        
        try {
          await pc.setRemoteDescription({ type: 'answer', sdp });
          console.log(`[CREATOR] Successfully set remote description for viewer ${viewerId}`);
        } catch (error) {
          console.error(`[CREATOR] Error setting remote description for viewer ${viewerId}:`, error);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        const { viewerId, candidate } = payload || {};
        if (!viewerId || !candidate) return;
        
        console.log(`[CREATOR] Received ICE candidate from viewer ${viewerId}`);
        const pc = peerConnectionsRef.current.get(viewerId);
        if (!pc || !pc.remoteDescription) return;
        
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error(`[CREATOR] Error adding ICE candidate for viewer ${viewerId}:`, error);
        }
      });

    console.log('[CREATOR] signaling topic=', canonicalChannel);

    console.log('[CREATOR] signaling topic=', canonicalChannel);

    // Subscribe and wait for SUBSCRIBED status
    return new Promise((resolve, reject) => {
      channel.subscribe((status) => {
        console.log('[CREATOR] channel status:', status, 'topic=', channel.topic);
        
        if (status === 'SUBSCRIBED') {
          signalingChannelRef.current = channel;
          
          // Proactive nudge loop for 5 seconds to catch race conditions
          let nudgeCount = 0;
          const maxNudges = 6; // ~5 seconds (6 * 800ms)
          
          const nudgeLoop = async () => {
            if (nudgeCount >= maxNudges) return;
            
            const currentWaitingViewers = Array.from(waitingViewersRef.current);
            if (currentWaitingViewers.length > 0) {
              console.log(`[CREATOR] Nudge #${nudgeCount + 1}: re-offering to ${currentWaitingViewers.length} viewers`);
              
              for (const viewerId of currentWaitingViewers) {
                const pc = peerConnectionsRef.current.get(viewerId);
                const needsOffer = !pc || pc.connectionState !== 'connected';
                if (needsOffer) {
                  await issueOffer(viewerId);
                }
              }
            }
            
            nudgeCount++;
            if (nudgeCount < maxNudges) {
              proactiveOfferTimeoutRef.current = setTimeout(nudgeLoop, 800);
            } else {
              // Clear waiting viewers after nudging is complete
              waitingViewersRef.current.clear();
            }
          };
          
          // Store the nudge function for use after announce-live
          (signalingChannelRef.current as any).__nudgeLoop = nudgeLoop;
          
          resolve(channel);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Signaling setup failed: ${status}`));
        }
      });
    });
  }, [user]);

  const startBroadcast = async () => {
    // SFU path (skip P2P setup)
    if (USE_SFU) {
      console.log('[CREATOR] Using LiveKit SFU');
      try {
        const sfu = createSFU();
        const identity = user?.id!;
        const creatorId = user?.id!;
        
        const resp = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role: 'creator', creatorId, identity })
        });
        
        const responseData = await resp.json();
        if (responseData.error) throw new Error(responseData.error);
        
        const { token, host } = responseData;
        await sfu.connect(host, token);
        await sfu.publishCameraMic();
        
        setMediaState(prev => ({ ...prev, isStreaming: true }));
        
        // Store sfu handle for cleanup
        (window as any).__creatorSFU = sfu;
        
        console.log('[CREATOR] SFU broadcast started successfully');
        return; // skip legacy P2P
      } catch (e) {
        console.error('[CREATOR] SFU publish failed', e);
        setMediaState(prev => ({ ...prev, isStreaming: false }));
        toast({
          title: "Failed to start SFU broadcast",
          description: "Please try again",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      console.log('Starting broadcast...')
      setMediaState(prev => ({ ...prev, isStreaming: true }))

      // STEP 1: Initialize media first
      await initMedia()
      
      // STEP 2: Set up signaling channel and handlers BEFORE going live
      await setupSignalingChannel()

      // STEP 3: Generate queue ID and upsert queue mapping
      const queueId = crypto.randomUUID();
      const creatorUserId = user?.id;
      
      if (creatorUserId) {
        // Close any existing open queue for this creator
        await supabase.from('queues')
          .update({ status: 'closed' })
          .eq('creator_user_id', creatorUserId)
          .eq('status', 'open');
        
        // Insert the new active queue
        await supabase.from('queues')
          .upsert({ id: queueId, creator_user_id: creatorUserId, status: 'open' }, { onConflict: 'id' });
        
        console.log('[CREATOR] Queue mapping created:', { queueId, creatorUserId });
      }

      // STEP 4: Create live session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_sessions')
        .insert({
          creator_id: user?.id,
          started_at: new Date().toISOString(),
          calls_taken: 0,
          total_earnings_cents: 0
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating live session:', sessionError)
        throw sessionError
      }

      setMediaState(prev => ({ ...prev, currentSession: { ...sessionData, queueId } }))
      console.log('Live session created:', sessionData.id)

      // STEP 5: Announce going live and start proactive nudging
      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'announce-live',
          payload: { ts: Date.now() }
        });
        
        // Start the nudge loop immediately if we have waiting viewers
        const nudgeLoop = (signalingChannelRef.current as any).__nudgeLoop;
        if (nudgeLoop && waitingViewersRef.current.size > 0) {
          setTimeout(nudgeLoop, 100);
        }
      }

    } catch (error) {
      console.error('Error starting broadcast:', error)
      setMediaState(prev => ({ ...prev, isStreaming: false }))
      toast({
        title: "Failed to start broadcast",
        description: "Please try again",
        variant: "destructive"
      })
    }
  }

  const stopBroadcast = async () => {
    console.log('Stopping broadcast...')
    
    // SFU cleanup
    if (USE_SFU && (window as any).__creatorSFU) {
      try {
        await (window as any).__creatorSFU.disconnect();
        (window as any).__creatorSFU = undefined;
        console.log('[CREATOR] SFU disconnected');
      } catch (e) {
        console.error('[CREATOR] SFU disconnect error', e);
      }
    }
    
    // Clear proactive offer timeout
    if (proactiveOfferTimeoutRef.current) {
      clearTimeout(proactiveOfferTimeoutRef.current);
    }
    
    // Announce creator going offline
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'creator-offline'
      });
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, viewerId) => {
      console.log(`[CREATOR] Closing connection to viewer ${viewerId}`);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    
    // Close queue mapping
    if (mediaState.currentSession?.queueId) {
      await supabase.from('queues')
        .update({ status: 'closed' })
        .eq('id', mediaState.currentSession.queueId);
      console.log('[CREATOR] Queue closed:', mediaState.currentSession.queueId);
    }
    
    // Update live session record
    if (mediaState.currentSession) {
      const { error: updateError } = await supabase
        .from('live_sessions')
        .update({
          ended_at: new Date().toISOString(),
          session_duration_minutes: Math.floor((Date.now() - new Date(mediaState.currentSession.started_at).getTime()) / 60000)
        })
        .eq('id', mediaState.currentSession.id)

      if (updateError) {
        console.error('Error updating live session:', updateError)
      } else {
        console.log('Live session ended:', mediaState.currentSession.id)
      }
    }
    
    cleanup()
    setMediaState(prev => ({ 
      ...prev, 
      currentSession: null, 
      isStreaming: false,
      loading: true
    }))
    onEnd()
  }

  const clearLobbyChat = async () => {
    try {
      const { error } = await supabase
        .from('lobby_chat_messages')
        .delete()
        .eq('creator_id', user?.id)

      if (error) {
        console.error('Error clearing lobby chat:', error)
        toast({
          title: "Failed to clear chat",
          description: "Please try again",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Chat cleared",
          description: "Lobby chat has been cleared"
        })
      }
    } catch (error) {
      console.error('Error clearing lobby chat:', error)
      toast({
        title: "Failed to clear chat", 
        description: "Please try again",
        variant: "destructive"
      })
    }
  }

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

  // WebRTC broadcasting to viewers with request/response handshake
  useEffect(() => {
    if (!user || !streamRef.current) return;

    let peerConnections: Map<string, RTCPeerConnection> = new Map();
    let signalChannel: any = null;

    const setupBroadcasting = async () => {
      try {
        console.log('[LOBBY_BROADCAST] Setting up WebRTC broadcasting with handshake support');
        
        // Helper to create peer connection for a viewer
        const createPeerForViewer = (viewerId: string): RTCPeerConnection => {
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          });

          // Store reference for debug monitoring
          peerConnectionsRef.current.set(viewerId, pc);

          // Add local stream tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, streamRef.current!);
            });
          }

          // Handle ICE candidates for this viewer
          pc.onicecandidate = (event) => {
            if (event.candidate && signalChannel) {
              iceCandidateCountRef.current += 1;
              console.log(`[RTC-DEBUG] ICE candidate generated (count: ${iceCandidateCountRef.current})`);
              console.log(`[LOBBY_BROADCAST] Sending ICE candidate to viewer ${viewerId}`);
              signalChannel.send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: { viewerId, candidate: event.candidate }
              });
            }
          };

          // Monitor connection state
          pc.onconnectionstatechange = () => {
            console.log(`[LOBBY_BROADCAST] Viewer ${viewerId} connection state:`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              console.log(`[LOBBY_BROADCAST] Cleaning up failed connection for viewer ${viewerId}`);
              setTimeout(() => {
                pc.close();
                peerConnections.delete(viewerId);
              }, 1000);
            }
          };

          return pc;
        };
        
        // Get creator user ID and use canonical channel
        const creatorUserId = user.id;
        const canonicalChannel = canonicalSignalChannel(creatorUserId);
        console.log('[CREATOR] using canonical channel', canonicalChannel);
        
        // Set up signaling channel with request/response handlers
        signalChannel = supabase.channel(canonicalChannel)
          .on('broadcast', { event: 'request-offer' }, async ({ payload }) => {
            const { viewerId } = payload || {};
            if (!viewerId) return;
            
            console.log(`[LOBBY_BROADCAST] Received offer request from viewer ${viewerId}`);
            
            try {
              // Get or create peer connection for this viewer
              let pc = peerConnections.get(viewerId);
              if (!pc) {
                pc = createPeerForViewer(viewerId);
                peerConnections.set(viewerId, pc);
              }

              // Create offer for this viewer
              const offer = await pc.createOffer({ 
                offerToReceiveAudio: true, 
                offerToReceiveVideo: true 
              });
              await pc.setLocalDescription(offer);
              
            console.log('[CREATOR] sending offer event with payload', { viewerId, sdp: offer.sdp });
            signalChannel.send({
              type: 'broadcast',
              event: 'offer',
              payload: { viewerId, sdp: offer.sdp }
            });
            } catch (error) {
              console.error(`[LOBBY_BROADCAST] Error creating offer for viewer ${viewerId}:`, error);
            }
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }) => {
            const { viewerId, sdp } = payload || {};
            if (!viewerId || !sdp) return;
            
            console.log(`[LOBBY_BROADCAST] Received answer from viewer ${viewerId}`);
            const pc = peerConnections.get(viewerId);
            if (!pc) return;
            
            try {
              await pc.setRemoteDescription({ type: 'answer', sdp });
              console.log(`[LOBBY_BROADCAST] Successfully set remote description for viewer ${viewerId}`);
            } catch (error) {
              console.error(`[LOBBY_BROADCAST] Error setting remote description for viewer ${viewerId}:`, error);
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            const { viewerId, candidate } = payload || {};
            if (!viewerId || !candidate) return;
            
            console.log(`[LOBBY_BROADCAST] Received ICE candidate from viewer ${viewerId}`);
            const pc = peerConnections.get(viewerId);
            if (!pc || !pc.remoteDescription) return;
            
            try {
              iceCandidateCountRef.current += 1;
              console.log(`[RTC-DEBUG] ICE candidate received (count: ${iceCandidateCountRef.current})`);
              await pc.addIceCandidate(candidate);
            } catch (error) {
              console.error(`[LOBBY_BROADCAST] Error adding ICE candidate for viewer ${viewerId}:`, error);
            }
          })
          .subscribe((status) => {
            console.log('[LOBBY_BROADCAST] Subscription status:', status);
            
            // Only proceed with legacy offer after subscription is ready
            if (status === 'SUBSCRIBED') {
              // Create legacy offer after a short delay
              setTimeout(() => {
                createInitialOffer();
              }, 1000);
            }
          });

        // Legacy support: Send initial offer for immediate viewers (called after subscription)
        const createInitialOffer = async () => {
          const legacyViewerId = 'viewer';
          const pc = createPeerForViewer(legacyViewerId);
          peerConnections.set(legacyViewerId, pc);

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
          
          console.log('[CREATOR] sending offer event with payload', { viewerId: legacyViewerId, sdp: offer.sdp });
          signalChannel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { viewerId: legacyViewerId, sdp: offer.sdp }
          });
          } catch (error) {
            console.error('[LOBBY_BROADCAST] Error creating legacy offer:', error);
          }
        };

      } catch (error) {
        console.error('[LOBBY_BROADCAST] Error setting up broadcasting:', error);
      }
    };

    setupBroadcasting();

    // Setup debug stats monitoring if debug=1 is in URL
    const isDebugMode = window.location.search.includes('debug=1');
    if (isDebugMode && !debugIntervalRef.current) {
      debugIntervalRef.current = setInterval(() => {
        // Get first peer connection for stats (most representative)
        const firstPc = peerConnectionsRef.current.values().next().value;
        if (firstPc) {
          const localTrackCount = streamRef.current ? streamRef.current.getTracks().length : 0;
          
          setDebugStats({
            signalingState: firstPc.signalingState,
            iceConnectionState: firstPc.iceConnectionState,
            connectionState: firstPc.connectionState,
            localTrackCount,
            iceCandidateCount: iceCandidateCountRef.current
          });
        }
      }, 1000);
    }

    // Cleanup
    return () => {
      console.log('[LOBBY_BROADCAST] Cleaning up WebRTC broadcasting');
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
      peerConnections.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      if (signalChannel) {
        // Send creator-offline event before closing
        const queueId = mediaState.currentSession?.queueId;
        if (queueId) {
          signalChannel.send({
            type: 'broadcast',
            event: 'creator-offline',
            payload: { queueId }
          });
        }
        if ((window as any).__allow_ch_teardown) {
          try { supabase.removeChannel(signalChannel); } catch {}
        } else {
          console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
        }
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearLobbyChat}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  Clear Chat
                </Button>
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

      {/* Debug Overlay - Creator (bottom-left) */}
      {window.location.search.includes('debug=1') && (
        <div 
          className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-[9999] max-w-xs"
          style={{ fontFamily: 'monospace' }}
        >
          <div className="font-bold mb-1">CREATOR</div>
          <div>Signal: {debugStats.signalingState}</div>
          <div>ICE: {debugStats.iceConnectionState}</div>
          <div>Conn: {debugStats.connectionState}</div>
          <div>Local Tracks: {debugStats.localTrackCount}</div>
          <div>ICE Candidates: {debugStats.iceCandidateCount}</div>
          <div>Peer Connections: {peerConnectionsRef.current.size}</div>
        </div>
      )}
    </div>
  )
}