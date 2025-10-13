import { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, VideoPresets, ConnectionState, setLogLevel } from 'livekit-client';
import { fetchLiveKitToken } from '@/lib/sfuToken';
import { lobbyRoomName } from '@/lib/lobbyIdentity';

export type LiveKitRoomConfig = {
  role: 'viewer' | 'publisher';
  creatorId: string;
  identity: string;
  roomName?: string; // Explicit room override for preview room
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
  const logLevelSetRef = useRef(false);
  const retryCountRef = useRef(0);
  
  // Generate unique instance ID for tracking
  const instanceIdRef = useRef(`lk-${Math.random().toString(36).substr(2, 9)}`);
  const instanceId = instanceIdRef.current;

  useEffect(() => {
    if (!config) {
      setConnectionState('idle');
      return;
    }

    let isMounted = true;
    let currentRoom: Room | null = null;
    let tokenRefreshTimer: NodeJS.Timeout | null = null;

    // Enable LiveKit debug logging once
    if (!logLevelSetRef.current) {
      setLogLevel('debug');
      logLevelSetRef.current = true;
      console.log('[useLiveKitRoom] 🐛 LiveKit debug logging enabled');
    }

    const connect = async (isReconnect = false) => {
      const retryAttempt = retryCountRef.current;
      
      try {
        if (!isReconnect) {
          setConnectionState('connecting');
          setError(null);
        }

        const resolvedRoom = config.roomName ?? lobbyRoomName(config.creatorId);
        console.log(`[useLiveKitRoom:${instanceId}] 🏠 ROOM RESOLUTION:`, {
          configRole: config.role,
          configIdentity: config.identity,
          configCreatorId: config.creatorId,
          explicitRoomName: config.roomName,
          resolvedRoomName: resolvedRoom,
          isReconnect,
          retryAttempt
        });

        // Log before token fetch
        console.log('[useLiveKitRoom] 🎫 Fetching LiveKit token...', {
          role: config.role,
          creatorId: config.creatorId,
          identity: config.identity,
          roomName: config.roomName
        });

        // Fetch token
        const tokenResponse = await fetchLiveKitToken({
          role: config.role,
          creatorId: config.creatorId,
          identity: config.identity,
          roomName: config.roomName,
        });

        // Log token fetch success
        console.log('[useLiveKitRoom] ✅ Token fetched successfully', {
          hasToken: !!tokenResponse.token,
          tokenLength: tokenResponse.token?.length,
          url: tokenResponse.url,
          room: tokenResponse.room
        });

        // Emit token event for debug HUD with role and instanceId
        window.dispatchEvent(new CustomEvent('lk:token', { 
          detail: { 
            url: tokenResponse.url, 
            room: tokenResponse.room,
            tokenLength: tokenResponse.token?.length,
            role: config.role,
            instanceId
          } 
        }));

        const { token, url, room: tokenRoom } = tokenResponse;
        
        // Validate room name matches
        console.info(`[useLiveKitRoom:${instanceId}] ✅ Token received`, {
          requestedRoom: resolvedRoom,
          tokenRoom: tokenRoom || 'not specified',
          role: config.role
        });
        
        if (tokenRoom && tokenRoom !== resolvedRoom) {
          console.error(`[useLiveKitRoom:${instanceId}] ❌ ROOM MISMATCH!`, {
            requestedRoom: resolvedRoom,
            tokenRoom: tokenRoom,
            role: config.role
          });
          throw new Error(`Room mismatch: requested ${resolvedRoom} but got token for ${tokenRoom}`);
        }

        if (!isMounted) {
          console.log(`[useLiveKitRoom:${instanceId}] ⚠️ Component unmounted during token fetch`);
          return;
        }

        // If reconnecting, disconnect existing room first
        if (isReconnect && currentRoom) {
          console.log(`[useLiveKitRoom:${instanceId}] Disconnecting for token refresh`);
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
          console.log(`[useLiveKitRoom:${instanceId}] 🔗 CONNECTED TO ROOM:`, {
            actualRoomName: newRoom.name,
            myIdentity: newRoom.localParticipant.identity,
            remoteParticipantCount: newRoom.remoteParticipants.size,
            remoteIdentities: Array.from(newRoom.remoteParticipants.values()).map(p => p.identity)
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

        // Add connection state change listener
        newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log('[useLiveKitRoom] 📡 ConnectionStateChanged:', state);
          window.dispatchEvent(new CustomEvent('lk:state', { 
            detail: { connectionState: state, error: null } 
          }));
        });

        // Connect to room with auto-subscribe enabled
        const connectOptions = { autoSubscribe: true };
        
        // Log before connect
        console.log(`[useLiveKitRoom:${instanceId}] 🔌 Attempting to connect to room: ${resolvedRoom}`, {
          url,
          tokenRoom,
          identity: config.identity,
          options: connectOptions
        });
        
        // Race connect against 10s timeout
        const connectPromise = newRoom.connect(url, token, connectOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
        );

        await Promise.race([connectPromise, timeoutPromise]);

        // Log after connect promise resolves
        console.log('[useLiveKitRoom] 📡 connect() promise resolved');

        if (!isMounted) {
          console.log('[useLiveKitRoom] ⚠️ Component unmounted after connection');
          await newRoom.disconnect();
          return;
        }

        setRoom(newRoom);
        console.log(`[useLiveKitRoom:${instanceId}] ✅ Connection established`, {
          role: config.role,
          identity: config.identity,
          roomName: resolvedRoom
        });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        
        // Enhanced error logging
        console.error('[useLiveKitRoom] ❌ Connection failed:', {
          error: err,
          errorMessage: errorObj.message,
          errorStack: errorObj.stack,
          errorType: errorObj.constructor.name,
          retryAttempt,
          config: {
            role: config.role,
            creatorId: config.creatorId,
            identity: config.identity,
            roomName: config.roomName
          }
        });

        // Emit error event for debug HUD
        window.dispatchEvent(new CustomEvent('lk:state', { 
          detail: { connectionState: 'failed', error: errorObj.message } 
        }));

        if (isMounted) {
          setConnectionState('failed');
          setError(errorObj);
        }

        // Retry with exponential backoff (max 3 attempts)
        if (retryCountRef.current < 3 && isMounted) {
          const delays = [2000, 4000, 8000];
          const delay = delays[retryCountRef.current] + Math.random() * 1000; // Add jitter
          
          console.log(`[useLiveKitRoom] 🔄 Retry ${retryCountRef.current + 1}/3 in ${(delay/1000).toFixed(1)}s (reason: ${errorObj.message})`);
          
          setTimeout(() => {
            if (isMounted) {
              retryCountRef.current++;
              connect(true);
            }
          }, delay);
        } else if (retryCountRef.current >= 3) {
          console.error('[useLiveKitRoom] ❌ Max retries (3) exceeded, giving up');
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
