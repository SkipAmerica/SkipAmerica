import { useEffect, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, VideoPresets } from 'livekit-client';
import { fetchLiveKitToken } from '@/lib/sfuToken';

export type LiveKitRoomConfig = {
  role: 'viewer' | 'publisher';
  creatorId: string;
  identity: string;
};

export type LiveKitConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

/**
 * Custom hook for managing LiveKit room connections
 * Handles connection lifecycle, reconnection, and cleanup
 */
export function useLiveKitRoom(config: LiveKitRoomConfig | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<LiveKitConnectionState>('idle');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!config) {
      setConnectionState('idle');
      return;
    }

    let isMounted = true;
    let currentRoom: Room | null = null;

    const connect = async () => {
      try {
        setConnectionState('connecting');
        setError(null);

        console.log('[useLiveKitRoom] Connecting...', config);

        // Fetch token
        const { token, url, room: roomName } = await fetchLiveKitToken({
          role: config.role,
          creatorId: config.creatorId,
          identity: config.identity,
        });

        if (!isMounted) return;

        // Create room with queue-optimized quality settings (540p for performance)
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          disconnectOnPageLeave: false,
          videoCaptureDefaults: {
            resolution: VideoPresets.h540.resolution, // 960x540 @ 30fps
            deviceId: undefined,
          },
          publishDefaults: {
            videoSimulcastLayers: [
              VideoPresets.h540,  // 960x540 medium quality
              VideoPresets.h360,  // 640x360 low quality
            ],
            dtx: false,
            videoEncoding: {
              maxBitrate: 2_000_000, // 2Mbps for queue preview (down from 5Mbps)
              maxFramerate: 30,
            },
          },
        });

        currentRoom = newRoom;

        // Setup handlers before connecting
        newRoom.on(RoomEvent.Connected, () => {
          console.log('[useLiveKitRoom] Connected to room:', roomName);
          console.log('[useLiveKitRoom] Room participants:', {
            localParticipant: newRoom.localParticipant.identity,
            remoteParticipantsCount: newRoom.remoteParticipants.size,
            remoteParticipants: Array.from(newRoom.remoteParticipants.values()).map(p => p.identity)
          });
          
          // Log audio context state
          if (typeof AudioContext !== 'undefined') {
            const audioContext = new AudioContext();
            console.log('[useLiveKitRoom] AudioContext state:', audioContext.state);
            audioContext.close();
          }
          
          if (isMounted) setConnectionState('connected');
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('[useLiveKitRoom] Disconnected from room');
          if (isMounted) setConnectionState('disconnected');
        });

        newRoom.on(RoomEvent.Reconnecting, () => {
          console.log('[useLiveKitRoom] Reconnecting...');
          if (isMounted) setConnectionState('connecting');
        });

        newRoom.on(RoomEvent.Reconnected, () => {
          console.log('[useLiveKitRoom] Reconnected');
          if (isMounted) setConnectionState('connected');
        });

        // Connect to room with auto-subscribe enabled
        const connectOptions = { autoSubscribe: true };
        console.log('[useLiveKitRoom] Connecting with options:', connectOptions);
        
        await newRoom.connect(url, token, connectOptions);

        if (!isMounted) {
          await newRoom.disconnect();
          return;
        }

        setRoom(newRoom);
        console.log('[useLiveKitRoom] ✅ Connection established', {
          role: config.role,
          identity: config.identity,
          roomName: roomName
        });
      } catch (err) {
        console.error('[useLiveKitRoom] Connection error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Connection failed'));
          setConnectionState('failed');
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (currentRoom) {
        console.log('[useLiveKitRoom] Cleaning up room connection');
        currentRoom.disconnect();
        setRoom(null);
      }
    };
  }, [config]);

  return {
    room,
    connectionState,
    error,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isFailed: connectionState === 'failed',
  };
}
