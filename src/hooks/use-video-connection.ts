import { useEffect, useRef, useState, useCallback } from 'react';
import { sfuConnectionManager, ConnectionConfig, ConnectionState } from '@/services/sfu-connection-manager';

export interface UseVideoConnectionOptions {
  config: ConnectionConfig;
  onVideoElement?: (videoEl: HTMLVideoElement, participantIdentity: string) => void;
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
  onVideoElement,
  onDisconnected,
  autoConnect = true,
}: UseVideoConnectionOptions): UseVideoConnectionResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const roomKeyRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || roomKeyRef.current) {
      console.log('[useVideoConnection] Already connected or connecting');
      return;
    }

    isConnectingRef.current = true;

    try {
      const roomKey = await sfuConnectionManager.connect(config);
      roomKeyRef.current = roomKey;

      // Subscribe to state changes
      const unsubState = sfuConnectionManager.onStateChange(roomKey, (state) => {
        setConnectionState(state);
      });
      unsubscribersRef.current.push(unsubState);

      // Subscribe to video tracks if handler provided
      if (onVideoElement) {
        const unsubVideo = sfuConnectionManager.onVideoTrack(roomKey, (videoEl, identity) => {
          onVideoElement(videoEl, identity);
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
  }, [config, onVideoElement, onDisconnected]);

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
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionState,
    connect,
    disconnect,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isFailed: connectionState === 'failed',
  };
}
