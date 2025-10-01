import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2, AlertCircle, Expand } from 'lucide-react';
import { useVideoConnection } from '@/hooks/use-video-connection';
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
  onConnectionChange?: (state: 'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected') => void;
  onFullscreen?: () => void;
}

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
  const currentVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(muted);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);

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

  // Resolve room creator ID
  useEffect(() => {
    const resolveRoom = async () => {
      // ROOM LOGIC:
      // - If chatCreatorId is provided: use it as the room (e.g., creator viewing fan's room)
      // - Publishers: join their own room (userId as room)
      // - Viewers: join the resolved creator's room
      const resolved = chatCreatorId || (role === 'publisher' 
        ? userId 
        : (await resolveCreatorUserId(userId)) || userId);
      
      console.debug('[UserVideoSFU] Room logic:', { role, userId, chatCreatorId, resolved });
      setResolvedUserId(resolved);
      setRoomCreatorId(resolved);
    };

    resolveRoom();
  }, [userId, role, chatCreatorId]);

  // Use centralized video connection manager
  const { connectionState, isConnected } = useVideoConnection({
    config: {
      role,
      creatorId: roomCreatorId || userId,
      identity: userId,
    },
    onVideoElement: (videoEl, participantIdentity) => {
      console.log(`[UserVideoSFU] Received video element for ${participantIdentity}`);
      
      // Only attach video if it matches the filter (for QCC fan video filtering)
      // Note: For general viewing (no filter), always attach
      if (chatParticipantFilter && participantIdentity !== chatParticipantFilter) {
        console.debug('[UserVideoSFU] Ignoring video from non-matching participant');
        return;
      }
      
      // Track-based attachment: replace DOM node with the new video element
      if (videoRef.current && currentVideoElementRef.current !== videoEl) {
        const parent = videoRef.current.parentElement;
        if (parent) {
          // Copy properties to new element
          videoEl.className = cn("w-full h-full object-cover", dimensions);
          videoEl.muted = isMuted;
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          
          // Replace in DOM
          parent.replaceChild(videoEl, videoRef.current);
          videoRef.current = videoEl;
          currentVideoElementRef.current = videoEl;
          
          // Ensure playback
          videoEl.play().catch(() => {});
          
          console.log('[UserVideoSFU] Video element attached and configured');
        }
      }
    },
    onDisconnected: () => {
      console.warn('[UserVideoSFU] Connection disconnected');
    },
    autoConnect: !!roomCreatorId, // Only connect once room is resolved
  });

  // Notify parent of connection state changes
  useEffect(() => {
    onConnectionChange?.(connectionState);
  }, [connectionState, onConnectionChange]);

  // Sync muted prop with state
  useEffect(() => {
    setIsMuted(muted);
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

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
      {!isConnected && (
        <div className="absolute inset-0">
          {renderFallback()}
        </div>
      )}

      {/* Chat overlay */}
      {showChat && resolvedUserId && isConnected && (
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
      {showFullscreenButton && isConnected && onFullscreen && (
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
