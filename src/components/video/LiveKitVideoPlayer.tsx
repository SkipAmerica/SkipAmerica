import { useEffect, useRef, useState } from 'react';
import { Room, Track, RoomEvent, RemoteTrackPublication, VideoQuality } from 'livekit-client';
import { useLiveKitRoom, LiveKitRoomConfig } from '@/hooks/use-livekit-room';
import { cn } from '@/lib/utils';

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
  className = "w-full h-full object-cover rounded-2xl",
  muted = true,
  onConnectionStateChange,
  fallbackContent,
  targetParticipantId,
}: LiveKitVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
    let attachedVideoTrack: any = null;
    let attachedAudioTrack: any = null;

    const attachTracks = () => {
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

      // Detach any existing tracks first
      if (attachedVideoTrack && videoRef.current) {
        try {
          attachedVideoTrack.detach(videoRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach previous video track:', e);
        }
        attachedVideoTrack = null;
      }
      
      if (attachedAudioTrack && audioRef.current) {
        try {
          attachedAudioTrack.detach(audioRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach previous audio track:', e);
        }
        attachedAudioTrack = null;
      }
      
      // If targetParticipantId is specified, ONLY show that participant
      let participantsToTry = remoteParticipants;
      
      if (targetParticipantId) {
        const targetParticipant = remoteParticipants.find(p => p.identity === targetParticipantId);
        if (!targetParticipant) {
          console.log('[LiveKitVideoPlayer] Target participant not found, showing fallback');
          if (mounted) {
            setHasVideo(false);
          }
          return; // Don't show any video
        }
        console.log('[LiveKitVideoPlayer] Found target participant:', targetParticipantId);
        // Only try the target participant's tracks
        participantsToTry = [targetParticipant];
      }
      
      for (const participant of participantsToTry) {
        const allPublications = Array.from(participant.trackPublications.values()) as RemoteTrackPublication[];
        
        // Attach VIDEO tracks
        const videoPublications = allPublications.filter(pub => pub.kind === 'video' && pub.track !== undefined);
        for (const videoPublication of videoPublications) {
          if (videoPublication.track && videoRef.current) {
            console.log('[LiveKitVideoPlayer] ✅ Attaching video track from:', participant.identity, 'source:', videoPublication.source);
            
            // Request high quality (1080p with automatic fallback to 720p)
            videoPublication.setVideoQuality(VideoQuality.HIGH);
            console.log('[LiveKitVideoPlayer] Requested HIGH video quality (1080p @ ~5Mbps)');
            
            const videoTrack = videoPublication.track;
            videoTrack.attach(videoRef.current);
            attachedVideoTrack = videoTrack;
            
            if (mounted) {
              setHasVideo(true);
            }
          }
        }
        
        // Attach AUDIO tracks
        const audioPublications = allPublications.filter(pub => pub.kind === 'audio' && pub.track !== undefined);
        for (const audioPublication of audioPublications) {
          if (audioPublication.track && audioRef.current) {
            console.log('[LiveKitVideoPlayer] ✅ Attaching audio track from:', participant.identity);
            
            const audioTrack = audioPublication.track;
            audioTrack.attach(audioRef.current);
            attachedAudioTrack = audioTrack;
          }
        }
        
        // If we found tracks for this participant, we're done
        if (attachedVideoTrack || attachedAudioTrack) {
          return;
        }
      }
      
      console.log('[LiveKitVideoPlayer] No tracks available to attach');
    };

    // Try to attach existing tracks
    attachTracks();

    // Listen for track, participant, and publishing changes
    const handleTrackSubscribed = () => {
      console.log('[LiveKitVideoPlayer] Track subscribed event');
      attachTracks();
    };
    const handleTrackPublished = () => {
      console.log('[LiveKitVideoPlayer] Track published event');
      attachTracks();
    };
    const handleParticipantConnected = () => {
      console.log('[LiveKitVideoPlayer] Participant connected event');
      attachTracks();
    };
    const handleTrackUnsubscribed = (track: any) => {
      console.log('[LiveKitVideoPlayer] Track unsubscribed');
      if (track === attachedVideoTrack && videoRef.current) {
        try {
          track.detach(videoRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach video on unsubscribe:', e);
        }
        attachedVideoTrack = null;
        videoRef.current.srcObject = null;
      }
      if (track === attachedAudioTrack && audioRef.current) {
        try {
          track.detach(audioRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach audio on unsubscribe:', e);
        }
        attachedAudioTrack = null;
        audioRef.current.srcObject = null;
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
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
      attachedVideoTrack = null;
      attachedAudioTrack = null;
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
      
      // Detach tracks on cleanup
      if (attachedVideoTrack && videoRef.current) {
        try {
          attachedVideoTrack.detach(videoRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach video on cleanup:', e);
        }
      }
      
      if (attachedAudioTrack && audioRef.current) {
        try {
          attachedAudioTrack.detach(audioRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach audio on cleanup:', e);
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [room, targetParticipantId]);

  const showFallback = !isConnected || !hasVideo;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <video
        ref={videoRef}
        className={cn("w-full h-full object-cover rounded-2xl", className)}
        autoPlay
        playsInline
        muted={muted}
        style={{ opacity: showFallback ? 0 : 1 }}
      />
      
      {/* Hidden audio element for remote audio playback */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        muted={muted}
      />
      
      {showFallback && fallbackContent && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
          {fallbackContent}
        </div>
      )}
    </div>
  );
}
