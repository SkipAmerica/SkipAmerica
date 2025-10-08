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
  const originalStreamRef = useRef<MediaStream | null>(null); // Track unfiltered camera stream
  const startingRef = useRef(false);
  
  const filters = useBroadcastFilters();

  // Auto-start stream when visible and filter ready
  useEffect(() => {
    if (isVisible && filters.isReady && !stream && !startingRef.current) {
      console.log('[LobbyBroadcast] Auto-starting camera on mount');
      startStream();
    }
  }, [isVisible, filters.isReady]);

  // Cleanup ONLY on unmount (broadcast persists when hidden)
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('[LobbyBroadcast] Component unmounting, cleaning up stream');
        stopStream();
      }
    };
  }, []);

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
            autoGainControl: true,
            sampleRate: 48000, // CD quality
            channelCount: 2,   // Stereo
          }
      });
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('[LobbyBroadcast] Camera started:', {
        resolution: `${settings.width}x${settings.height}`,
        frameRate: settings.frameRate
      });

      // Store original stream
      originalStreamRef.current = mediaStream;

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
    const originalStream = originalStreamRef.current;

    console.log('[LobbyBroadcast] Stopping stream');
    
    // Stop processed stream tracks
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        track.stop();
        console.log('[LobbyBroadcast] Stopped processed track:', track.kind);
      });
    }

    // Stop original camera stream tracks if different
    if (originalStream && originalStream !== currentStream) {
      originalStream.getTracks().forEach(track => {
        track.stop();
        console.log('[LobbyBroadcast] Stopped original track:', track.kind);
      });
    }

    streamRef.current = null;
    originalStreamRef.current = null;
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
    const originalStream = originalStreamRef.current;
    if (!originalStream) {
      console.warn('[LobbyBroadcast] No original stream to apply filter to');
      return;
    }

    console.log('[LobbyBroadcast] Changing filter to:', filter);

    try {
      // Stop old processed stream (but keep original camera stream)
      const oldProcessedStream = streamRef.current;
      if (oldProcessedStream && oldProcessedStream !== originalStream) {
        oldProcessedStream.getTracks().forEach(track => {
          track.stop();
          console.log('[LobbyBroadcast] Stopped old processed track:', track.kind);
        });
      }

      // Apply new filter to original stream
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
  }, [filters]);

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
