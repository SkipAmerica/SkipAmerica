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
  userId: string;
  role: 'viewer' | 'publisher';
  dimensions?: string; // CSS classes for sizing
  showChat?: boolean;
  chatMode?: 'lobby' | 'private';
  chatCreatorId?: string;
  fanId?: string;
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
  fanId,
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

  useEffect(() => {
    if (!userId) return;

    let sfu: ReturnType<typeof createSFU> | null = null;
    
    const connectSFU = async () => {
      try {
        updateConnectionState('connecting');
        sfu = createSFU();
        sfuRef.current = sfu;

        // Handle remote video for viewer role
        if (role === 'viewer') {
          sfu.onRemoteVideo((incomingVideo, participantIdentity) => {
            console.debug('[UserVideoSFU] Remote video received:', { participantIdentity, fanId, shouldAttach: !fanId || participantIdentity === fanId });
            
            // If fanId is provided, only attach video from that specific participant
            if (fanId && participantIdentity !== fanId) {
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
      }
    };

    connectSFU();

    return () => {
      if (sfu) {
        sfu.disconnect().catch(() => {});
        sfuRef.current = null;
      }
    };
  }, [userId, role, isMuted, updateConnectionState]);

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
          fanId={fanId}
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