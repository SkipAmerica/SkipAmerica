import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { resolveCreatorUserId } from '@/lib/queueResolver';
import OverlayChat from '@/components/live/OverlayChat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { LiveKitPublisher } from '@/components/video/LiveKitPublisher';

export interface UserVideoSFUProps {
  userId: string;
  role: 'viewer' | 'publisher';
  dimensions?: string;
  showChat?: boolean;
  chatMode?: 'lobby' | 'private';
  chatCreatorId?: string;
  videoRoomCreatorId?: string;
  chatParticipantFilter?: string;
  identityOverride?: string;
  className?: string;
  muted?: boolean;
  showControls?: boolean;
  showFullscreenButton?: boolean;
  fallbackAvatar?: string;
  fallbackName?: string;
  userName?: string;
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
  videoRoomCreatorId,
  chatParticipantFilter,
  identityOverride,
  className = "",
  muted = true,
  showControls = false,
  showFullscreenButton = false,
  fallbackAvatar,
  fallbackName = "User",
  userName,
  onConnectionChange,
  onFullscreen
}: UserVideoSFUProps) {
  const [isMuted, setIsMuted] = useState(muted);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Resolve room creator ID for VIDEO connection
  useEffect(() => {
    const resolveRoom = async () => {
      const resolved = videoRoomCreatorId || (role === 'publisher' 
        ? userId 
        : (await resolveCreatorUserId(userId)) || userId);
      
      console.debug('[UserVideoSFU] Video room logic:', { 
        role, 
        userId, 
        videoRoomCreatorId, 
        chatCreatorId, 
        resolvedVideoRoom: resolved 
      });
      
      setResolvedUserId(resolved);
      setRoomCreatorId(resolved);
    };

    resolveRoom();
  }, [userId, role, videoRoomCreatorId, chatCreatorId]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onConnectionChange?.(connected ? 'connected' : 'connecting');
    
    if (!connected) {
      toast({
        title: "Connection Issue",
        description: "Attempting to reconnect to video...",
        variant: "default",
      });
    }
  }, [onConnectionChange, toast]);

  // Sync muted prop with state
  useEffect(() => {
    setIsMuted(muted);
  }, [muted]);

  const renderFallback = () => (
    <div className="flex items-center justify-center w-full h-full bg-muted/20 rounded-lg">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Connecting...</span>
      </div>
    </div>
  );

  const identity = role === 'publisher' 
    ? userId 
    : (identityOverride || `${userId}-viewer-${Date.now()}`);

  // Stabilize config objects to prevent unnecessary re-renders
  const publisherConfig = useMemo(() => ({
    role: 'publisher' as const,
    creatorId: roomCreatorId || '',
    identity: identity,
  }), [roomCreatorId, identity]);

  const viewerConfig = useMemo(() => ({
    role: role,
    creatorId: roomCreatorId || '',
    identity: identity,
  }), [role, roomCreatorId, identity]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-black", dimensions, className)}>
      {/* Publisher: publish local tracks */}
      {role === 'publisher' && roomCreatorId && (
        <LiveKitPublisher
          config={publisherConfig}
          publishAudio={true}
          publishVideo={true}
        />
      )}

      {/* Video player */}
      {roomCreatorId && (
        <LiveKitVideoPlayer
          config={viewerConfig}
          className="w-full h-full object-cover"
          muted={isMuted}
          onConnectionStateChange={handleConnectionChange}
          fallbackContent={renderFallback()}
        />
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

      {/* Private Chat Button */}
      {showFullscreenButton && isConnected && onFullscreen && (
        <div className="absolute top-2 right-2 z-30">
          <Button
            onClick={onFullscreen}
            variant="outline"
            size="sm"
            className="bg-black/50 border-white/20 text-white hover:bg-black/70 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">Private Chat{userName ? ` with ${userName}` : ''}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
