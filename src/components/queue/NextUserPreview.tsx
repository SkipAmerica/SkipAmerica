import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, Track } from 'livekit-client';
import { fetchLiveKitToken } from '@/lib/sfuToken';
import { lobbyRoomName, creatorIdentity, isCreator } from '@/lib/lobbyIdentity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NextUserPreviewProps {
  userId: string;
  creatorId: string;
  userName?: string;
  discussionTopic?: string;
  waitTime?: number;
  muted?: boolean;
  onMuteToggle?: () => void;
  onStartCall?: () => void;
  onFullscreen?: () => void;
  disableMuteToggle?: boolean;
}

export function NextUserPreview({
  userId,
  creatorId,
  userName = 'Anonymous User',
  discussionTopic,
  waitTime,
  muted = true,
  onMuteToggle,
  onStartCall,
  onFullscreen,
  disableMuteToggle = false
}: NextUserPreviewProps) {
  const [showNotification, setShowNotification] = useState(true);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [attachedParticipant, setAttachedParticipant] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowNotification(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Event-driven connection to lobby
  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const roomName = lobbyRoomName(creatorId);
        const identity = creatorIdentity(creatorId);

        console.log('[NextUserPreview] 🔌 Connecting to lobby:', roomName, 'as', identity);

        const { token, url } = await fetchLiveKitToken({
          role: 'viewer',
          creatorId,
          identity,
          sessionId: undefined,
        });

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        // Event: Track subscribed (primary mechanism)
        room.on(RoomEvent.TrackSubscribed, (
          track: Track,
          pub: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          if (cancelled) return;
          if (track.kind !== Track.Kind.Video) return;
          if (isCreator(participant.identity, creatorId)) {
            console.log('[NextUserPreview] ⏭️ Skipping creator self-track');
            return;
          }

          console.log('[NextUserPreview] 🎥 TrackSubscribed video from', participant.identity);
          
          if (videoEl.current) {
            try {
              const videoTrack = track as any;
              if (videoEl.current.srcObject) {
                videoEl.current.srcObject = null;
              }
              videoTrack.attach?.(videoEl.current);
              setAttachedParticipant(participant.identity);
              setIsConnecting(false);
            } catch (e) {
              console.error('[NextUserPreview] Attach failed:', e);
            }
          }
        });

        // Event: Participant connected
        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          if (cancelled) return;
          console.log('[NextUserPreview] 👤 ParticipantConnected:', p.identity);
        });

        // Event: Participant disconnected
        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          if (cancelled) return;
          console.log('[NextUserPreview] 👋 ParticipantDisconnected:', p.identity);
          
          if (p.identity === attachedParticipant) {
            if (videoEl.current) {
              videoEl.current.srcObject = null;
            }
            setAttachedParticipant(null);
            setIsConnecting(true);
          }
        });

        await room.connect(url, token);
        console.log('[NextUserPreview] ✅ Connected to lobby:', room.name);

        // Check if a fan is already in the room
        for (const p of room.remoteParticipants.values()) {
          if (isCreator(p.identity, creatorId)) continue;
          
          const videoTracks = Array.from(p.videoTrackPublications.values());
          const videoPub = videoTracks.find((pub) => pub.isSubscribed && pub.track);
          
          if (videoPub?.track && videoEl.current) {
            console.log('[NextUserPreview] 🔄 Attaching existing participant:', p.identity);
            try {
              (videoPub.track as any).attach?.(videoEl.current);
              setAttachedParticipant(p.identity);
              setIsConnecting(false);
            } catch (e) {
              console.error('[NextUserPreview] Attach existing failed:', e);
            }
            break;
          }
        }
      } catch (e) {
        console.error('[NextUserPreview] ❌ Connect failed:', e);
        setIsConnecting(false);
      }
    }

    connect();

    return () => {
      cancelled = true;
      const room = roomRef.current;
      if (!room) return;
      
      console.log('[NextUserPreview] 🔌 Disconnecting from lobby');
      try {
        room.disconnect();
      } catch (e) {
        console.warn('[NextUserPreview] Disconnect error:', e);
      }
      roomRef.current = null;
    };
  }, [creatorId]);

  return (
    <div className="relative w-full">
      {/* Privacy Notification */}
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-50",
        "bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full",
        "border border-white/20 text-white text-xs font-medium",
        "transition-opacity duration-1000",
        showNotification ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {userName} cannot see you
      </div>
      
      {/* Fan's Camera Feed */}
      <div className="border border-primary/20 rounded-lg overflow-hidden bg-black">
        <video
          ref={videoEl}
          autoPlay
          playsInline
          muted={muted}
          className="w-full aspect-video object-cover"
        />
        
        {/* Loading state */}
        {isConnecting && !attachedParticipant && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
              <p className="text-sm">Waiting for {userName}'s video...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Overlay with Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-lg p-3">
        <div className="flex items-end justify-between">
          <div className="flex-1">
            {discussionTopic && (
              <p className="text-xs text-white/90 mb-1 line-clamp-1">
                {discussionTopic}
              </p>
            )}
            {waitTime !== undefined && (
              <p className="text-xs text-white/70">
                Wait: {formatWaitTime(waitTime)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onMuteToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 w-8 p-0 rounded-full",
                        disableMuteToggle && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={onMuteToggle}
                      disabled={disableMuteToggle}
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4 text-white" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {disableMuteToggle 
                      ? "Unmute after broadcast" 
                      : muted 
                        ? "Unmute fan audio" 
                        : "Mute fan audio"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onStartCall && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 px-4 shrink-0"
                onClick={onStartCall}
              >
                Start
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
