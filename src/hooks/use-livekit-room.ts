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
    let tokenRefreshTimer: NodeJS.Timeout | null = null;

    const connect = async (isReconnect = false) => {
      try {
        if (!isReconnect) {
          setConnectionState('connecting');
          setError(null);
        }

        console.log('[useLiveKitRoom] Connecting...', { isReconnect, config });

        // Fetch token
        const { token, url, room: roomName } = await fetchLiveKitToken({
          role: config.role,
          creatorId: config.creatorId,
          identity: config.identity,
        });

        if (!isMounted) return;

        // If reconnecting, disconnect existing room first
        if (isReconnect && currentRoom) {
          console.log('[useLiveKitRoom] Disconnecting for token refresh');
          await currentRoom.disconnect();
        }

        // Create room with broadcast-grade quality settings
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          disconnectOnPageLeave: false,
          videoCaptureDefaults: {
            resolution: VideoPresets.h1080.resolution,
            deviceId: undefined,
          },
          publishDefaults: {
            videoSimulcastLayers: [
              VideoPresets.h1080, // 1920x1080 high quality
              VideoPresets.h720,  // 1280x720 medium quality
              VideoPresets.h360,  // 640x360 low quality
            ],
            dtx: false,
            videoEncoding: {
              maxBitrate: 5_000_000,
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
          
          // Schedule token refresh at 8 minutes (before 10-min expiry)
          if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
          tokenRefreshTimer = setTimeout(() => {
            console.log('[useLiveKitRoom] Token refresh scheduled');
            connect(true);
          }, 8 * 60 * 1000);
        });

        newRoom.on(RoomEvent.Disconnected, (reason) => {
          console.log('[useLiveKitRoom] Disconnected from room, reason:', reason);
          if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
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
          
          // Retry connection after 3 seconds on failure
          setTimeout(() => {
            if (isMounted) {
              console.log('[useLiveKitRoom] Retrying connection...');
              connect(true);
            }
          }, 3000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
      if (currentRoom) {
        console.log('[useLiveKitRoom] Cleaning up room connection');
        currentRoom.disconnect();
        setRoom(null);
      }
    };
  }, [config?.role, config?.creatorId, config?.identity]);

  return {
    room,
    connectionState,
    error,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isFailed: connectionState === 'failed',
  };
}
