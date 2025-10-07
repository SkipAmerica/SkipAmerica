import { useEffect, useRef, useState } from 'react';
import { Room, Track, RoomEvent } from 'livekit-client';
import { useLiveKitRoom, LiveKitRoomConfig } from '@/hooks/use-livekit-room';

interface LiveKitVideoPlayerProps {
  config: LiveKitRoomConfig;
  className?: string;
  muted?: boolean;
  onConnectionStateChange?: (connected: boolean) => void;
  fallbackContent?: React.ReactNode;
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

    const attachVideoTrack = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      
      for (const participant of remoteParticipants) {
        const videoPublication = participant.getTrackPublication(Track.Source.Camera);
        
        if (videoPublication?.track && videoRef.current) {
          console.log('[LiveKitVideoPlayer] Attaching video track from:', participant.identity);
          
          const videoTrack = videoPublication.track;
          videoTrack.attach(videoRef.current);
          
          if (mounted) {
            setHasVideo(true);
          }
          return;
        }
      }
    };

    // Try to attach existing tracks
    attachVideoTrack();

    // Listen for track and participant changes
    const handleTrackSubscribed = () => {
      attachVideoTrack();
    };
    const handleTrackUnsubscribed = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (mounted) {
        setHasVideo(false);
      }
    };
    const handleParticipantDisconnected = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (mounted) {
        setHasVideo(false);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      mounted = false;
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      
      // Detach all tracks from video element
      if (videoRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = null;
      }
    };
  }, [room]);

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
