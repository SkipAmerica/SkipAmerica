import { useEffect, useRef, useState } from 'react';
import { Room, Track, RoomEvent, RemoteTrackPublication } from 'livekit-client';
import { useLiveKitRoom, LiveKitRoomConfig } from '@/hooks/use-livekit-room';

interface LiveKitVideoPlayerProps {
  config: LiveKitRoomConfig;
  className?: string;
  muted?: boolean;
  onConnectionStateChange?: (connected: boolean) => void;
  fallbackContent?: React.ReactNode;
  targetParticipantId?: string;
}

/**
 * LiveKit video player component for viewing remote video streams
 * Automatically handles track subscription and attachment
 */
export function LiveKitVideoPlayer({
  config,
  className = "w-full h-full object-cover",
  muted = true,
  onConnectionStateChange,
  fallbackContent,
  targetParticipantId,
}: LiveKitVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const { room, connectionState, isConnected } = useLiveKitRoom(config);

  // Notify parent of connection state changes
  useEffect(() => {
    onConnectionStateChange?.(isConnected);
  }, [isConnected, onConnectionStateChange]);

  // Handle video track attachment
  useEffect(() => {
    if (!room || !videoRef.current) return;

    let mounted = true;
    let attachedTrack: any = null;

    const attachVideoTrack = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      
      console.log('[LiveKitVideoPlayer] Remote participants:', remoteParticipants.map(p => ({
        identity: p.identity,
        sid: p.sid,
        tracks: Array.from(p.trackPublications.values()).map((pub: any) => ({
          kind: pub.kind,
          source: pub.source,
          subscribed: pub.isSubscribed
        }))
      })));

      // Detach any existing track first
      if (attachedTrack && videoRef.current) {
        try {
          attachedTrack.detach(videoRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach previous track:', e);
        }
        attachedTrack = null;
      }
      
      // Prefer the target participant if specified
      let targetParticipant = null;
      if (targetParticipantId) {
        targetParticipant = remoteParticipants.find(p => p.identity === targetParticipantId);
        if (targetParticipant) {
          console.log('[LiveKitVideoPlayer] Found target participant:', targetParticipantId);
        } else {
          console.log('[LiveKitVideoPlayer] Target participant not found:', targetParticipantId);
        }
      }
      
      // If target found, try their tracks first, otherwise try all participants
      const participantsToTry = targetParticipant 
        ? [targetParticipant, ...remoteParticipants.filter(p => p !== targetParticipant)]
        : remoteParticipants;
      
      for (const participant of participantsToTry) {
        // Try any video track publication (camera, screen share, etc.)
        const allPublications = Array.from(participant.trackPublications.values()) as RemoteTrackPublication[];
        const videoPublications = allPublications.filter(pub => pub.kind === 'video' && pub.track !== undefined);
        
        for (const videoPublication of videoPublications) {
          if (videoPublication.track && videoRef.current) {
            console.log('[LiveKitVideoPlayer] ✅ Attaching video track from:', participant.identity, 'source:', videoPublication.source);
            
            const videoTrack = videoPublication.track;
            videoTrack.attach(videoRef.current);
            attachedTrack = videoTrack;
            
            if (mounted) {
              setHasVideo(true);
            }
            return;
          }
        }
      }
      
      console.log('[LiveKitVideoPlayer] No video tracks available to attach');
    };

    // Try to attach existing tracks
    attachVideoTrack();

    // Listen for track, participant, and publishing changes
    const handleTrackSubscribed = () => {
      console.log('[LiveKitVideoPlayer] Track subscribed event');
      attachVideoTrack();
    };
    const handleTrackPublished = () => {
      console.log('[LiveKitVideoPlayer] Track published event');
      attachVideoTrack();
    };
    const handleParticipantConnected = () => {
      console.log('[LiveKitVideoPlayer] Participant connected event');
      attachVideoTrack();
    };
    const handleTrackUnsubscribed = (track: any) => {
      console.log('[LiveKitVideoPlayer] Track unsubscribed');
      if (track === attachedTrack && videoRef.current) {
        try {
          track.detach(videoRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach on unsubscribe:', e);
        }
        attachedTrack = null;
        videoRef.current.srcObject = null;
      }
      if (mounted) {
        setHasVideo(false);
      }
    };
    const handleParticipantDisconnected = () => {
      console.log('[LiveKitVideoPlayer] Participant disconnected');
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      attachedTrack = null;
      if (mounted) {
        setHasVideo(false);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      mounted = false;
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackPublished, handleTrackPublished);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      
      // Detach track on cleanup
      if (attachedTrack && videoRef.current) {
        try {
          attachedTrack.detach(videoRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach on cleanup:', e);
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [room, targetParticipantId]);

  const showFallback = !isConnected || !hasVideo;

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className={className}
        autoPlay
        playsInline
        muted={muted}
        style={{ opacity: showFallback ? 0 : 1 }}
      />
      
      {showFallback && fallbackContent && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          {fallbackContent}
        </div>
      )}
    </div>
  );
}
