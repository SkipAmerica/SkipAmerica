import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2, AlertCircle, Expand } from 'lucide-react';
import { createSFU } from '@/lib/sfu';
import { fetchLiveKitToken } from '@/lib/livekitToken';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import OverlayChat from '@/components/live/OverlayChat';
import { cn } from '@/lib/utils';

export interface UserVideoSFUProps {
  userId: string; // Target user whose video/room we're joining
  role: 'viewer' | 'publisher';
  dimensions?: string; // CSS classes for sizing
  showChat?: boolean;
  chatMode?: 'lobby' | 'private';
  chatCreatorId?: string; // Override which room to join for chat
  chatParticipantFilter?: string; // Filter chat messages by specific participant
  className?: string;
  muted?: boolean;
  showControls?: boolean;
  showFullscreenButton?: boolean;
  fallbackAvatar?: string;
  fallbackName?: string;
  onConnectionChange?: (state: ConnectionState) => void;
  onFullscreen?: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected';

export function UserVideoSFU({
  userId,
  role,
  dimensions = "w-full h-full",
  showChat = false,
  chatMode = 'lobby',
  chatCreatorId,
  chatParticipantFilter,
  className = "",
  muted = true,
  showControls = false,
  showFullscreenButton = false,
  fallbackAvatar,
  fallbackName = "User",
  onConnectionChange,
  onFullscreen
}: UserVideoSFUProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sfuRef = useRef<ReturnType<typeof createSFU> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [isMuted, setIsMuted] = useState(muted);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onConnectionChange?.(state);
  }, [onConnectionChange]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const connectSFU = useCallback(async () => {
    let sfu: ReturnType<typeof createSFU> | null = null;
    
    try {
      updateConnectionState('connecting');
      sfu = createSFU();
      sfuRef.current = sfu;

      // Set up disconnection handlers
      // Don't reconnect on track unsubscribed - it's normal during stream changes
      sfu.onTrackUnsubscribed(() => {
        console.log('[UserVideoSFU] Track unsubscribed (normal during stream changes)');
      });

      // Only reconnect if the room itself disconnects unexpectedly
      sfu.onDisconnected(() => {
        console.warn('[UserVideoSFU] Room disconnected unexpectedly');
        updateConnectionState('disconnected');
        
        // Only reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000); // Exponential: 1s, 2s, 4s, 8s, max 10s
          console.log(`[UserVideoSFU] Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} after ${backoffDelay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSFU();
          }, backoffDelay);
        } else {
          console.error('[UserVideoSFU] Max reconnect attempts reached');
          updateConnectionState('failed');
        }
      });

      sfu.onConnectionStateChange((state) => {
        console.log('[UserVideoSFU] Connection state:', state);
        if (state === 'connected') {
          updateConnectionState('connected');
        } else if (state === 'connecting') {
          updateConnectionState('connecting');
        }
      });

      // Handle remote video for viewer role
      if (role === 'viewer') {
        sfu.onRemoteVideo((incomingVideo, participantIdentity) => {
            console.debug('[UserVideoSFU] Remote video received:', { participantIdentity, chatParticipantFilter, shouldAttach: !chatParticipantFilter || participantIdentity === chatParticipantFilter });
            
            // If chatParticipantFilter is provided, only attach video from that specific participant
            if (chatParticipantFilter && participantIdentity !== chatParticipantFilter) {
              console.debug('[UserVideoSFU] Ignoring video from non-matching participant');
              return;
            }
            
            const currentVideo = videoRef.current;
            if (!currentVideo) return;
            
            if (currentVideo !== incomingVideo && currentVideo.parentElement) {
              incomingVideo.className = currentVideo.className;
              incomingVideo.muted = isMuted;
              currentVideo.parentElement.replaceChild(incomingVideo, currentVideo);
              // @ts-ignore
              videoRef.current = incomingVideo;
              try { 
                incomingVideo.play().catch(() => {}); 
              } catch {}
            }
          });
        }

        // Determine room creator ID
        // ROOM LOGIC:
        // - If chatCreatorId is provided: use it as the room (e.g., creator viewing fan's room)
        // - Publishers: join their own room (userId as room)
        // - Viewers: join the resolved creator's room
        const roomCreatorId = chatCreatorId || (role === 'publisher' 
          ? userId 
          : (await resolveCreatorUserId(userId)) || userId);
        console.debug('[UserVideoSFU] Room logic:', { role, userId, chatCreatorId, roomCreatorId });
        setResolvedUserId(roomCreatorId);

        const { supabase } = await import('@/lib/supabaseClient');
        const { data } = await supabase.auth.getUser();
        const identity = data?.user?.id || crypto.randomUUID();

        // Get LiveKit token
        const { token, url } = await fetchLiveKitToken({
          role: role as "viewer" | "publisher",
          creatorId: roomCreatorId,
          identity,
        });

        // Connect to LiveKit
        await sfu.connect(url, token);
        updateConnectionState('connected');
        
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        console.log('[UserVideoSFU] Successfully connected');

        // Handle local video for publisher role
        if (role === 'publisher') {
          await sfu.publishCameraMic();
          
          // Attach local video to preview
          const preview = videoRef.current;
          if (preview) {
            const videoPublication = Array.from(sfu.room.localParticipant.videoTrackPublications.values())[0];
            if (videoPublication?.videoTrack) {
              preview.autoplay = true;
              preview.playsInline = true;
              preview.muted = true;
              videoPublication.videoTrack.attach(preview);
            }
          }
        }

    } catch (error) {
      console.error('[UserVideoSFU] Connection failed:', error);
      updateConnectionState('failed');
      
      // Only retry if it's a recoverable error (e.g., internal/network errors)
      const isRecoverable = error && typeof error === 'object' && 'reason' in error && (error as any).reason === 2; // InternalError
      
      if (isRecoverable && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const backoffDelay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current - 1), 15000); // Exponential: 2s, 4s, 8s, 15s max
        console.log(`[UserVideoSFU] Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} after ${backoffDelay}ms (recoverable error)`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSFU();
        }, backoffDelay);
      } else {
        console.error('[UserVideoSFU] Connection failed permanently or max attempts reached');
        updateConnectionState('failed');
      }
      
      if (sfu) {
        sfu.disconnect().catch(() => {});
        sfuRef.current = null;
      }
    }
  }, [userId, role, isMuted, updateConnectionState]);

  useEffect(() => {
    if (!userId) return;

    connectSFU();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (sfuRef.current) {
        sfuRef.current.disconnect().catch(() => {});
        sfuRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    };
  }, [userId, connectSFU]);

  const renderFallback = () => (
    <div className="flex items-center justify-center w-full h-full bg-muted/20 rounded-lg">
      {connectionState === 'connecting' ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Connecting...</span>
        </div>
      ) : connectionState === 'failed' ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">Connection failed</span>
        </div>
      ) : (
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-primary/10 text-xs">
            {getInitials(fallbackName)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-black", dimensions, className)}>
      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        autoPlay
        className="w-full h-full object-cover"
      />
      
      {/* Fallback overlay when not connected */}
      {connectionState !== 'connected' && (
        <div className="absolute inset-0">
          {renderFallback()}
        </div>
      )}

      {/* Chat overlay */}
      {showChat && resolvedUserId && connectionState === 'connected' && (
        <OverlayChat 
          creatorId={chatCreatorId || resolvedUserId}
          chatMode={chatMode}
          participantFilter={chatParticipantFilter}
          leftButton={
            showControls ? (
              <Button
                onClick={toggleMute}
                variant="outline"
                size="sm"
                className="bg-transparent border border-white text-white hover:bg-white/10 shrink-0"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Fullscreen Button */}
      {showFullscreenButton && connectionState === 'connected' && onFullscreen && (
        <div className="absolute top-2 right-2 z-30">
          <Button
            onClick={onFullscreen}
            variant="outline"
            size="icon"
            className="bg-black/50 border-white/20 text-white hover:bg-black/70 h-8 w-8"
          >
            <Expand className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}