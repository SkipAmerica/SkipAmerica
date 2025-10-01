import { useEffect, useRef, useState, useCallback } from 'react';
import { RemoteTrack } from 'livekit-client';
import { sfuConnectionManager, ConnectionConfig, ConnectionState } from '@/services/sfu-connection-manager';

export interface UseVideoConnectionOptions {
  config: ConnectionConfig;
  onRemoteTrack?: (track: RemoteTrack, participantIdentity: string) => void;
  onDisconnected?: () => void;
  autoConnect?: boolean;
}

export interface UseVideoConnectionResult {
  connectionState: ConnectionState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  isFailed: boolean;
}

/**
 * Hook to manage SFU video connections with automatic cleanup
 * Uses the centralized connection manager for resource pooling
 */
export function useVideoConnection({
  config,
  onRemoteTrack,
  onDisconnected,
  autoConnect = true,
}: UseVideoConnectionOptions): UseVideoConnectionResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const roomKeyRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || roomKeyRef.current) {
      console.debug('[useVideoConnection] Already connected or connecting, skipping');
      return;
    }

    isConnectingRef.current = true;
    setConnectionState('connecting');

    try {
      const roomKey = await sfuConnectionManager.connect(config);
      roomKeyRef.current = roomKey;

      // Subscribe to state changes
      const unsubState = sfuConnectionManager.onStateChange(roomKey, (state) => {
        setConnectionState(state);
      });
      unsubscribersRef.current.push(unsubState);

      // Subscribe to video tracks if handler provided
      if (onRemoteTrack) {
        const unsubVideo = sfuConnectionManager.onVideoTrack(roomKey, (track, identity) => {
          onRemoteTrack(track, identity);
        });
        unsubscribersRef.current.push(unsubVideo);
      }

      // Subscribe to disconnect events if handler provided
      if (onDisconnected) {
        const unsubDisconnect = sfuConnectionManager.onDisconnect(roomKey, () => {
          onDisconnected();
        });
        unsubscribersRef.current.push(unsubDisconnect);
      }

      console.log('[useVideoConnection] Connected successfully:', roomKey);
    } catch (error) {
      console.error('[useVideoConnection] Connection failed:', error);
      setConnectionState('failed');
    } finally {
      isConnectingRef.current = false;
    }
  }, [config.role, config.creatorId, config.identity]);

  const disconnect = useCallback(async () => {
    // Unsubscribe from all events
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    if (roomKeyRef.current) {
      await sfuConnectionManager.disconnect(roomKeyRef.current);
      roomKeyRef.current = null;
    }

    setConnectionState('idle');
    isConnectingRef.current = false;
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !roomKeyRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    connectionState,
    connect,
    disconnect,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isFailed: connectionState === 'failed',
  };
}
