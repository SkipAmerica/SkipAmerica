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

  useEffect(() => {
    if (!room || !isConnected || isPublishing) return;
    
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

        console.log(`[LiveKitPublisher] Publishing ${tracks.length} tracks...`);

        for (const track of tracks) {
          if (track.kind === 'video') {
            console.log('[LiveKitPublisher] Publishing video with:', {
              codec: 'h264',
              maxBitrate: '2.5 Mbps',
              resolution: '1920x1080 @ 30fps',
              simulcast: true
            });
            await room.localParticipant.publishTrack(track, videoPublishOptions);
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

        console.log('[LiveKitPublisher] ✅ Tracks published successfully');
        onPublished?.();
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
          onError?.(error);
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
    };
  }, [room, isConnected, publishAudio, publishVideo, mediaStream, onPublished, onError, isPublishing]);

  return null; // This is a headless component
}
