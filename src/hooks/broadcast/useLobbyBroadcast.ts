import { useState, useRef, useCallback, useEffect } from 'react';
import { useBroadcastFilters } from './useBroadcastFilters';
import type { FilterPreset } from '@/lib/advancedFilterProcessor';

export interface LobbyBroadcastConfig {
  isVisible?: boolean;
}

export interface LobbyBroadcastAPI {
  stream: MediaStream | null;
  isStreaming: boolean;
  isCountdownActive: boolean;
  currentFilter: FilterPreset;
  isFilterReady: boolean;
  startStream: () => Promise<void>;
  stopStream: () => void;
  startCountdown: () => void;
  cancelCountdown: () => void;
  completeCountdown: () => void;
  changeFilter: (filter: FilterPreset) => Promise<void>;
}

/**
 * Manages lobby broadcast stream lifecycle.
 * Uses imperative control flow to prevent effect loops.
 */
export function useLobbyBroadcast(config: LobbyBroadcastConfig = {}): LobbyBroadcastAPI {
  const { isVisible = true } = config;
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  
  const filters = useBroadcastFilters();

  // Auto-start stream when visible and filter ready
  useEffect(() => {
    if (isVisible && filters.isReady && !stream && !startingRef.current) {
      console.log('[LobbyBroadcast] Auto-starting camera on mount');
      startStream();
    }
  }, [isVisible, filters.isReady]);

  // Cleanup when visibility changes
  useEffect(() => {
    if (!isVisible && stream) {
      console.log('[LobbyBroadcast] Component hidden, cleaning up stream');
      stopStream();
    }
  }, [isVisible]);

  const startStream = useCallback(async () => {
    if (startingRef.current || streamRef.current) {
      console.log('[LobbyBroadcast] Stream already starting or active');
      return;
    }

    startingRef.current = true;
    
    try {
      console.log('[LobbyBroadcast] Starting camera...');
      
      // Get base media stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, max: 60 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('[LobbyBroadcast] Camera started:', {
        resolution: `${settings.width}x${settings.height}`,
        frameRate: settings.frameRate
      });

      // Apply filter if selected
      let finalStream = mediaStream;
      if (filters.currentFilter !== 'none') {
        finalStream = await filters.applyFilter(filters.currentFilter, mediaStream);
      }

      streamRef.current = finalStream;
      setStream(finalStream);
      console.log('[LobbyBroadcast] Stream ready');
    } catch (error) {
      console.error('[LobbyBroadcast] Failed to start camera:', error);
      throw error;
    } finally {
      startingRef.current = false;
    }
  }, [filters]);

  const stopStream = useCallback(() => {
    const currentStream = streamRef.current;
    if (!currentStream) return;

    console.log('[LobbyBroadcast] Stopping stream');
    currentStream.getTracks().forEach(track => {
      track.stop();
      console.log('[LobbyBroadcast] Stopped track:', track.kind);
    });

    streamRef.current = null;
    setStream(null);
    setIsStreaming(false);
  }, []);

  const startCountdown = useCallback(() => {
    setIsCountdownActive(true);
  }, []);

  const cancelCountdown = useCallback(() => {
    setIsCountdownActive(false);
  }, []);

  const completeCountdown = useCallback(() => {
    setIsCountdownActive(false);
    setIsStreaming(true);
    console.log('[LobbyBroadcast] Broadcasting started');
  }, []);

  const changeFilter = useCallback(async (filter: FilterPreset) => {
    if (!stream) {
      console.warn('[LobbyBroadcast] No stream to apply filter to');
      return;
    }

    console.log('[LobbyBroadcast] Changing filter to:', filter);

    try {
      // Get original stream without filters
      const originalStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, max: 60 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Stop old stream
      stream.getTracks().forEach(track => track.stop());

      // Apply new filter
      let newStream = originalStream;
      if (filter !== 'none') {
        newStream = await filters.applyFilter(filter, originalStream);
      } else {
        await filters.removeFilter(originalStream);
      }

      streamRef.current = newStream;
      setStream(newStream);
      console.log('[LobbyBroadcast] Filter changed successfully');
    } catch (error) {
      console.error('[LobbyBroadcast] Failed to change filter:', error);
    }
  }, [stream, filters]);

  return {
    stream,
    isStreaming,
    isCountdownActive,
    currentFilter: filters.currentFilter,
    isFilterReady: filters.isReady,
    startStream,
    stopStream,
    startCountdown,
    cancelCountdown,
    completeCountdown,
    changeFilter
  };
}
