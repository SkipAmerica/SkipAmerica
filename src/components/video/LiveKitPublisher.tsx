import { useEffect, useState, useRef } from 'react';
import { Room, createLocalTracks, VideoPresets, TrackPublishOptions } from 'livekit-client';
import { useLiveKitRoom, LiveKitRoomConfig } from '@/hooks/use-livekit-room';

interface LiveKitPublisherProps {
  config: LiveKitRoomConfig;
  publishAudio?: boolean;
  publishVideo?: boolean;
  mediaStream?: MediaStream; // Optional: use provided stream instead of creating tracks
  onPublished?: () => void;
  onError?: (error: Error) => void;
}

/**
 * LiveKit publisher component for publishing local camera/mic
 * Automatically handles track creation and publishing
 */
export function LiveKitPublisher({
  config,
  publishAudio = true,
  publishVideo = true,
  mediaStream,
  onPublished,
  onError,
}: LiveKitPublisherProps) {
  const { room, isConnected } = useLiveKitRoom(config);
  const [isPublishing, setIsPublishing] = useState(false);
  const publishLockRef = useRef(false);
  const lastPublishAttemptRef = useRef(0);
  const publishAttemptRef = useRef(false);
  const publishedTracksRef = useRef<Set<string>>(new Set());
  const lastLogTimeRef = useRef(0);
  const lastRoomStateRef = useRef({ hasRoom: false, isConnected: false });
  
  // Stabilize callbacks with refs to prevent effect re-runs
  const onPublishedRef = useRef(onPublished);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onPublishedRef.current = onPublished;
  }, [onPublished]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Log config once per connection change
  useEffect(() => {
    console.info('[LiveKitPublisher] 🎬 Component config:', {
      role: config?.role,
      identity: config?.identity,
      roomName: config?.roomName,
      creatorId: config?.creatorId
    });
  }, [config?.role, config?.identity, config?.roomName, config?.creatorId]);

  // Log component render only when room state changes
  const currentHasRoom = !!room;
  const currentIsConnected = isConnected;
  if (lastRoomStateRef.current.hasRoom !== currentHasRoom || 
      lastRoomStateRef.current.isConnected !== currentIsConnected) {
    console.log('[LiveKitPublisher] 🎬 Component rendered', {
      hasRoom: currentHasRoom,
      isConnected: currentIsConnected,
      publishVideo,
      publishAudio,
      hasMediaStream: !!mediaStream,
      mediaStreamTracks: mediaStream?.getTracks().length || 0,
      config
    });
    lastRoomStateRef.current = { hasRoom: currentHasRoom, isConnected: currentIsConnected };
  }

  // Unpublish tracks when mediaStream becomes null (broadcast ended)
  useEffect(() => {
    if (!mediaStream && room?.localParticipant) {
      console.log('[LiveKitPublisher] MediaStream removed, unpublishing tracks');
      
      // Unpublish all local tracks
      room.localParticipant.audioTrackPublications.forEach(pub => {
        if (pub.track) {
          room.localParticipant.unpublishTrack(pub.track);
        }
      });
      room.localParticipant.videoTrackPublications.forEach(pub => {
        if (pub.track) {
          room.localParticipant.unpublishTrack(pub.track);
        }
      });
      
      // Reset all refs to allow fresh publish
      publishedTracksRef.current.clear();
      publishLockRef.current = false;
      publishAttemptRef.current = false;
      setIsPublishing(false);
      
      console.log('[LiveKitPublisher] ✅ Tracks unpublished, refs reset');
    }
  }, [mediaStream, room]);

  useEffect(() => {
    console.log('[LiveKitPublisher] 🔄 Publishing effect triggered', {
      isConnected,
      publishVideo,
      publishAudio,
      hasMediaStream: !!mediaStream,
      hasRoom: !!room,
      isPublishing,
      lockHeld: publishLockRef.current
    });

    if (!room || !isConnected) {
      // Gate log to once per second
      const now = Date.now();
      if (now - lastLogTimeRef.current > 1000) {
        console.log('[LiveKitPublisher] ⏸️ Not ready - no room or not connected');
        lastLogTimeRef.current = now;
      }
      return;
    }
    
    if (!publishVideo && !publishAudio) {
      console.log('[LiveKitPublisher] ⏸️ Not publishing - both audio and video disabled');
      return;
    }

    if (isPublishing || !mediaStream) {
      console.log('[LiveKitPublisher] ⏸️ Skipping - already publishing or no media stream');
      return;
    }
    
    // Skip publishing if tracks are already published (prevents flutter on reconnect)
    if (room.localParticipant) {
      const hasVideo = room.localParticipant.videoTrackPublications.size > 0;
      const hasAudio = room.localParticipant.audioTrackPublications.size > 0;
      
      if (hasVideo && hasAudio) {
        console.log('[LiveKitPublisher] ✅ Tracks already published, skipping');
        return;
      }
    }
    
    // Connection lock: Prevent concurrent publishing attempts
    if (publishLockRef.current || publishAttemptRef.current) {
      console.log('[LiveKitPublisher] 🔒 Publish already in progress, skipping');
      return;
    }
    
    // Debounce: Prevent rapid reconnect attempts (min 1 second between attempts)
    const now = Date.now();
    const timeSinceLastAttempt = now - lastPublishAttemptRef.current;
    if (timeSinceLastAttempt < 1000) {
      console.log(`[LiveKitPublisher] ⏳ Debouncing publish attempt (${timeSinceLastAttempt}ms since last)`);
      return;
    }
    
    lastPublishAttemptRef.current = now;

    let isMounted = true;

    const publish = async (attempt = 1) => {
      try {
        publishLockRef.current = true;
        publishAttemptRef.current = true;
        setIsPublishing(true);

        // Define broadcast-grade video publishing options (Instagram/TikTok quality)
        const videoPublishOptions: TrackPublishOptions = {
          videoCodec: 'h264', // H.264 for Safari/iOS hardware acceleration
          videoEncoding: {
            maxBitrate: 5_000_000, // 5 Mbps for crystal-clear 1080p
            maxFramerate: 30,
          },
          scalabilityMode: 'L3T3_KEY', // Better temporal scalability
          simulcast: true, // Enable adaptive bitrate with multiple layers
          videoSimulcastLayers: [
            VideoPresets.h1080, // 1920x1080 high quality
            VideoPresets.h720,  // 1280x720 medium quality
            VideoPresets.h360,  // 640x360 low quality
          ],
        };

        // Define high-quality audio publishing options
        const audioPublishOptions: TrackPublishOptions = {
          dtx: false, // Don't drop audio during silence
          audioPreset: {
            maxBitrate: 128_000, // 128 kbps stereo - matches Instagram/TikTok
          },
        };

        let tracks;
        
        // Use provided MediaStream if available, otherwise create tracks
        if (mediaStream) {
          console.log(`[LiveKitPublisher] Publishing ${mediaStream.getTracks().length} tracks from provided stream (attempt ${attempt})`);
          tracks = mediaStream.getTracks();
        } else {
          console.log(`[LiveKitPublisher] Creating local tracks... (attempt ${attempt})`);
          const localTracks = await createLocalTracks({
            audio: publishAudio,
            video: publishVideo ? {
              facingMode: 'user',
              resolution: VideoPresets.h1080.resolution, // 1920x1080
              frameRate: 30,
            } : false,
          });
          tracks = localTracks;
        }

        if (!isMounted) {
          // Clean up tracks if component unmounted
          if (!mediaStream) {
            tracks.forEach(track => track.stop());
          }
          return;
        }

        console.log('[LiveKitPublisher] 📡 ABOUT TO PUBLISH:', {
          roomName: room.name,
          localIdentity: room.localParticipant.identity,
          tracks: tracks.map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled, readyState: t.readyState })),
          currentParticipants: Array.from(room.remoteParticipants.values()).map(p => p.identity)
        });

        for (const track of tracks) {
          const trackId = track.id;
          
          // Skip if already published
          if (publishedTracksRef.current.has(trackId)) {
            console.log(`[LiveKitPublisher] Track ${trackId} already published, skipping`);
            continue;
          }
          
          if (track.kind === 'video') {
            console.log('[LiveKitPublisher] Publishing video with:', {
              codec: 'h264',
              maxBitrate: '2.5 Mbps',
              resolution: '1920x1080 @ 30fps',
              simulcast: true
            });
            await room.localParticipant.publishTrack(track, videoPublishOptions);
            publishedTracksRef.current.add(trackId);
          } else {
            // Log MediaStreamTrack properties before publishing
            console.log('[LiveKitPublisher] MediaStreamTrack properties:', {
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              id: track.id,
              label: track.label,
              settings: track.getSettings?.()
            });
            
            console.log('[LiveKitPublisher] Publishing audio track with settings:', {
              bitrate: '128 kbps',
              dtx: false,
              enabled: track.enabled,
              muted: track.muted
            });
            
            await room.localParticipant.publishTrack(track, audioPublishOptions);
            publishedTracksRef.current.add(trackId);
            
            console.log('[LiveKitPublisher] ✅ Audio track published successfully');
            
            // Log published audio track details
            const audioPublications = Array.from(room.localParticipant.audioTrackPublications.values());
            console.log('[LiveKitPublisher] Local audio publications:', audioPublications.map(pub => ({
              trackSid: pub.trackSid,
              trackName: pub.trackName,
              source: pub.source,
              muted: pub.isMuted,
              enabled: pub.track?.mediaStreamTrack?.enabled
            })));
          }
        }

        console.log('[LiveKitPublisher] ✅ PUBLISH COMPLETE:', {
          roomName: room.name,
          localIdentity: room.localParticipant.identity,
          publishedVideoTracks: room.localParticipant.videoTrackPublications.size,
          publishedAudioTracks: room.localParticipant.audioTrackPublications.size,
          videoTrackDetails: Array.from(room.localParticipant.videoTrackPublications.values()).map(pub => ({
            sid: pub.trackSid,
            name: pub.trackName,
            source: pub.source,
            dimensions: pub.dimensions,
            simulcasted: pub.simulcasted
          })),
          roomParticipants: Array.from(room.remoteParticipants.values()).map(p => p.identity)
        });
        
        // Reset publishing state on success
        onPublishedRef.current?.();
        setIsPublishing(false);
        publishLockRef.current = false;
      } catch (err) {
        console.error(`[LiveKitPublisher] Failed to publish tracks (attempt ${attempt}):`, err);
        
        // Retry up to 2 times for NotAllowedError or timing issues
        if (attempt < 3 && isMounted) {
          console.log(`[LiveKitPublisher] Retrying in 300ms...`);
          setTimeout(() => {
            if (isMounted) publish(attempt + 1);
          }, 300);
        } else {
          const error = err instanceof Error ? err : new Error('Failed to publish');
          onErrorRef.current?.(error);
        }
      } finally {
        if (isMounted && attempt >= 3) {
          setIsPublishing(false);
          publishLockRef.current = false;
        }
      }
    };

    publish();

    return () => {
      isMounted = false;
      publishLockRef.current = false;
      publishAttemptRef.current = false;
      publishedTracksRef.current.clear();
    };
  }, [room, isConnected, publishAudio, publishVideo, mediaStream, isPublishing]);

  return null; // This is a headless component
}
