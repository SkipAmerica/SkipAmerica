import { useEffect, useState } from 'react';
import { Room, createLocalTracks } from 'livekit-client';
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

  useEffect(() => {
    if (!room || !isConnected || isPublishing) return;

    let mounted = true;

    const publish = async (attempt = 1) => {
      try {
        setIsPublishing(true);

        let tracks;
        
        // Use provided MediaStream if available, otherwise create tracks
        if (mediaStream) {
          console.log(`[LiveKitPublisher] Publishing ${mediaStream.getTracks().length} tracks from provided stream (attempt ${attempt})`);
          tracks = mediaStream.getTracks();
        } else {
          console.log(`[LiveKitPublisher] Creating local tracks... (attempt ${attempt})`);
          const localTracks = await createLocalTracks({
            audio: publishAudio,
            video: publishVideo ? { facingMode: 'user' } : false,
          });
          tracks = localTracks;
        }

        if (!mounted) {
          // Clean up tracks if component unmounted
          if (!mediaStream) {
            tracks.forEach(track => track.stop());
          }
          return;
        }

        console.log(`[LiveKitPublisher] Publishing ${tracks.length} tracks...`);

        for (const track of tracks) {
          await room.localParticipant.publishTrack(track);
        }

        console.log('[LiveKitPublisher] ✅ Tracks published successfully');
        onPublished?.();
      } catch (err) {
        console.error(`[LiveKitPublisher] Failed to publish tracks (attempt ${attempt}):`, err);
        
        // Retry up to 2 times for NotAllowedError or timing issues
        if (attempt < 3 && mounted) {
          console.log(`[LiveKitPublisher] Retrying in 300ms...`);
          setTimeout(() => {
            if (mounted) publish(attempt + 1);
          }, 300);
        } else {
          const error = err instanceof Error ? err : new Error('Failed to publish');
          onError?.(error);
        }
      } finally {
        if (mounted && attempt >= 3) {
          setIsPublishing(false);
        }
      }
    };

    publish();

    return () => {
      mounted = false;
    };
  }, [room, isConnected, publishAudio, publishVideo, mediaStream, onPublished, onError, isPublishing]);

  return null; // This is a headless component
}
