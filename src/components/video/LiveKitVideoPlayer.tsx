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
  
  // Track which tracks are currently attached to prevent unnecessary re-attachments
  const attachedVideoSidRef = useRef<string | null>(null);
  const attachedAudioSidRef = useRef<string | null>(null);

  // Notify parent of connection state changes
  useEffect(() => {
    onConnectionStateChange?.(isConnected);
  }, [isConnected, onConnectionStateChange]);

  // Enhanced unmute behavior - ensure audio plays when user unmutes
  useEffect(() => {
    if (!muted && audioRef.current && isConnected) {
      console.log('[LiveKitVideoPlayer] User unmuted, ensuring audio plays');
      audioRef.current.play().catch(err => {
        console.warn('[LiveKitVideoPlayer] Audio play after unmute failed:', err);
      });
    }
  }, [muted, isConnected]);

  // Handle video track attachment
  useEffect(() => {
    if (!room || !videoRef.current) return;

    console.log('[LiveKitVideoPlayer] Connecting to room', {
      role: config.role,
      creatorId: config.creatorId,
      identity: config.identity,
      targetParticipant: targetParticipantId,
      expectedRoom: `lobby_${config.creatorId}`
    });

    let mounted = true;
    let attachedVideoTrack: any = null;
    let attachedAudioTrack: any = null;

    const attachTracks = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      
      console.log('[LiveKitVideoPlayer] 🔍 SEARCHING FOR TRACKS:', {
        roomName: room.name,
        myIdentity: room.localParticipant.identity,
        targetParticipantId: targetParticipantId,
        remoteParticipantCount: room.remoteParticipants.size,
        remoteIdentities: remoteParticipants.map(p => p.identity),
        targetFound: targetParticipantId ? room.remoteParticipants.has(targetParticipantId) : 'no target specified'
      });
      
      console.log('[LiveKitVideoPlayer] Remote participants details:', remoteParticipants.map(p => ({
        identity: p.identity,
        sid: p.sid,
        tracks: Array.from(p.trackPublications.values()).map((pub: any) => ({
          kind: pub.kind,
          source: pub.source,
          subscribed: pub.isSubscribed
        }))
      })));
      
      // Skip re-attachment if tracks are already attached (prevents jerking)
      if (attachedVideoSidRef.current && attachedAudioSidRef.current) {
        console.log('[LiveKitVideoPlayer] Tracks already attached, skipping re-attach');
        return;
      }

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
        console.log('[LiveKitVideoPlayer] 🎯 TARGET PARTICIPANT FOUND:', {
          targetIdentity: targetParticipantId,
          participantSid: targetParticipant.sid,
          videoTracks: Array.from(targetParticipant.videoTrackPublications.values()).map(pub => ({
            trackSid: pub.trackSid,
            subscribed: pub.isSubscribed,
            enabled: pub.isEnabled,
            dimensions: pub.dimensions
          })),
          audioTracks: Array.from(targetParticipant.audioTrackPublications.values()).map(pub => ({
            trackSid: pub.trackSid,
            subscribed: pub.isSubscribed,
            enabled: pub.isEnabled
          }))
        });
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
            attachedVideoSidRef.current = videoPublication.trackSid;
            
            if (mounted) {
              setHasVideo(true);
            }
          }
        }
        
        // Attach AUDIO tracks
        const audioPublications = allPublications.filter(pub => pub.kind === 'audio' && pub.track !== undefined);
        console.log('[LiveKitVideoPlayer] Found audio publications:', audioPublications.length, 'from', participant.identity);
        for (const audioPublication of audioPublications) {
          console.log('[LiveKitVideoPlayer] Audio track details:', {
            isMuted: audioPublication.isMuted,
            kind: audioPublication.kind,
            participant: participant.identity,
            subscribed: audioPublication.isSubscribed
          });
          if (audioPublication.track && audioRef.current) {
            console.log('[LiveKitVideoPlayer] ✅ Attaching audio track from:', participant.identity);
            
            const audioTrack = audioPublication.track;
            const audioElement = audioRef.current;
            
            // Log MediaStreamTrack properties
            const mediaStreamTrack = audioTrack.mediaStreamTrack;
            console.log('[LiveKitVideoPlayer] MediaStreamTrack state:', {
              enabled: mediaStreamTrack?.enabled,
              muted: mediaStreamTrack?.muted,
              readyState: mediaStreamTrack?.readyState,
              id: mediaStreamTrack?.id,
              label: mediaStreamTrack?.label
            });
            
            audioTrack.attach(audioElement);
            attachedAudioTrack = audioTrack;
            attachedAudioSidRef.current = audioPublication.trackSid;
            
            // Log HTMLAudioElement state after attachment
            console.log('[LiveKitVideoPlayer] HTMLAudioElement state after attach:', {
              muted: audioElement.muted,
              volume: audioElement.volume,
              paused: audioElement.paused,
              readyState: audioElement.readyState,
              srcObject: !!audioElement.srcObject,
              autoplay: audioElement.autoplay
            });
            
            // Add audio element event listeners for debugging
            const onPlay = () => console.log('[LiveKitVideoPlayer] 🔊 Audio element PLAY event');
            const onPlaying = () => console.log('[LiveKitVideoPlayer] 🔊 Audio element PLAYING event');
            const onPause = () => console.log('[LiveKitVideoPlayer] 🔇 Audio element PAUSE event');
            const onError = (e: any) => console.error('[LiveKitVideoPlayer] ❌ Audio element ERROR:', e);
            const onSuspend = () => console.log('[LiveKitVideoPlayer] ⏸️ Audio element SUSPEND event');
            const onWaiting = () => console.log('[LiveKitVideoPlayer] ⏳ Audio element WAITING event');
            
            audioElement.addEventListener('play', onPlay);
            audioElement.addEventListener('playing', onPlaying);
            audioElement.addEventListener('pause', onPause);
            audioElement.addEventListener('error', onError);
            audioElement.addEventListener('suspend', onSuspend);
            audioElement.addEventListener('waiting', onWaiting);
            
            // Attempt to play the audio explicitly
            console.log('[LiveKitVideoPlayer] Attempting to play audio...');
            audioElement.play().then(() => {
              console.log('[LiveKitVideoPlayer] ✅ Audio play() succeeded');
            }).catch((err) => {
              console.error('[LiveKitVideoPlayer] ❌ Audio play() failed:', err.name, err.message);
              if (err.name === 'NotAllowedError') {
                console.error('[LiveKitVideoPlayer] Audio blocked by autoplay policy - user interaction required');
              }
            });
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
      // Only re-attach if no tracks are currently attached
      if (!attachedVideoSidRef.current && !attachedAudioSidRef.current) {
        attachTracks();
      }
    };
    const handleTrackPublished = () => {
      console.log('[LiveKitVideoPlayer] Track published event');
      // Only re-attach if no tracks are currently attached
      if (!attachedVideoSidRef.current && !attachedAudioSidRef.current) {
        attachTracks();
      }
    };
    const handleParticipantConnected = () => {
      console.log('[LiveKitVideoPlayer] Participant connected event');
      // Only re-attach if no tracks are currently attached
      if (!attachedVideoSidRef.current && !attachedAudioSidRef.current) {
        attachTracks();
      }
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
        attachedVideoSidRef.current = null;
        videoRef.current.srcObject = null;
      }
      if (track === attachedAudioTrack && audioRef.current) {
        try {
          track.detach(audioRef.current);
        } catch (e) {
          console.warn('[LiveKitVideoPlayer] Failed to detach audio on unsubscribe:', e);
        }
        attachedAudioTrack = null;
        attachedAudioSidRef.current = null;
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
      attachedVideoSidRef.current = null;
      attachedAudioSidRef.current = null;
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
