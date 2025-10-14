import { useEffect, useState, useRef, useMemo } from 'react';
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
  const [isPublished, setIsPublished] = useState(false);
  
  // Idempotency guards - prevent re-publishing the same stream
  const publishInFlightRef = useRef<Promise<void> | null>(null);
  const publishedOnceRef = useRef(false);
  const lastStreamKeyRef = useRef<string>("");

  // Build a stable key from the current mediaStream to detect real changes
  const streamKey = useMemo(() => {
    if (!mediaStream) return "none";
    const trackIds = mediaStream.getTracks().map(t => `${t.kind}:${t.id}:${t.readyState}`).join("|");
    return `${mediaStream.id}::${trackIds}`;
  }, [mediaStream]);

  // Connection key to trigger effects on connection changes
  const connectionKey = useMemo(() => (isConnected ? "connected" : "disconnected"), [isConnected]);

  // Reset published flag when stream changes (allow fresh publish)
  useEffect(() => {
    if (lastStreamKeyRef.current && lastStreamKeyRef.current !== streamKey) {
      console.log('[LiveKitPublisher] Stream changed, resetting publish flag');
      publishedOnceRef.current = false;
      setIsPublished(false);
    }
  }, [streamKey]);

  // Main publishing effect - publish stream once per unique stream
  useEffect(() => {
    // 1) Must be connected
    if (!isConnected || !room) {
      return;
    }

    // 2) Must have a stream with at least one live track we intend to publish
    if (!mediaStream) return;
    
    const tracksToPublish = mediaStream.getTracks().filter(t => {
      if (t.readyState !== "live") return false;
      if (t.kind === "video" && publishVideo) return true;
      if (t.kind === "audio" && publishAudio) return true;
      return false;
    });
    
    if (tracksToPublish.length === 0) return;

    // 3) If we already published this exact stream, do nothing
    if (publishedOnceRef.current && lastStreamKeyRef.current === streamKey) {
      return;
    }

    // 4) If a publish op is currently in flight, don't start another
    if (publishInFlightRef.current) {
      return;
    }

    // 5) Mark this stream as the active one we're publishing
    lastStreamKeyRef.current = streamKey;

    // 6) Publish exactly once
    publishInFlightRef.current = (async () => {
      try {
        console.log('[LiveKitPublisher] 📡 Publishing tracks:', {
          streamId: mediaStream.id,
          tracks: tracksToPublish.map(t => ({ kind: t.kind, id: t.id })),
          roomName: room.name,
          identity: room.localParticipant.identity
        });

        // Define broadcast-grade video publishing options
        const videoPublishOptions: TrackPublishOptions = {
          videoCodec: 'h264',
          videoEncoding: {
            maxBitrate: 2_500_000, // 2.5 Mbps
            maxFramerate: 30,
          },
        };

        // Define high-quality audio publishing options
        const audioPublishOptions: TrackPublishOptions = {
          dtx: false,
          audioPreset: {
            maxBitrate: 128_000,
          },
        };

        for (const track of tracksToPublish) {
          const opts = track.kind === 'video' ? videoPublishOptions : audioPublishOptions;
          await room.localParticipant.publishTrack(track, opts);
          console.log(`[LiveKitPublisher] ✅ Published ${track.kind} track:`, track.id);
        }

        publishedOnceRef.current = true;
        setIsPublished(true);
        onPublished?.();
        
        console.log('[LiveKitPublisher] ✅ All tracks published successfully');
      } catch (err: any) {
        console.error('[LiveKitPublisher] ❌ Publish failed:', err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    })().finally(() => {
      publishInFlightRef.current = null;
    });

  }, [connectionKey, streamKey, publishVideo, publishAudio, room, isConnected, mediaStream, onPublished, onError]);

  return null; // This is a headless component
}
