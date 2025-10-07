import { useEffect, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
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

    let mounted = true;
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

        if (!mounted) return;

        // Create room with optimized settings
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          disconnectOnPageLeave: false,
        });

        currentRoom = newRoom;

        // Setup handlers before connecting
        newRoom.on(RoomEvent.Connected, () => {
          console.log('[useLiveKitRoom] Connected to room:', roomName);
          if (mounted) setConnectionState('connected');
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('[useLiveKitRoom] Disconnected from room');
          if (mounted) setConnectionState('disconnected');
        });

        newRoom.on(RoomEvent.Reconnecting, () => {
          console.log('[useLiveKitRoom] Reconnecting...');
          if (mounted) setConnectionState('connecting');
        });

        newRoom.on(RoomEvent.Reconnected, () => {
          console.log('[useLiveKitRoom] Reconnected');
          if (mounted) setConnectionState('connected');
        });

        // Connect to room with auto-subscribe enabled
        await newRoom.connect(url, token, { autoSubscribe: true });

        if (!mounted) {
          await newRoom.disconnect();
          return;
        }

        setRoom(newRoom);
        console.log('[useLiveKitRoom] ✅ Connection established');
      } catch (err) {
        console.error('[useLiveKitRoom] Connection error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Connection failed'));
          setConnectionState('failed');
        }
      }
    };

    connect();

    return () => {
      mounted = false;
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
