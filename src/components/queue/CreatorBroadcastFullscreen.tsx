import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";
import { useLiveStore } from "@/stores/live-store";
import type { LiveState } from "@/shared/types/live";
import { FilterSelector } from "./FilterSelector";
import { getFilterProcessor, type FilterPreset } from "@/lib/advancedFilterProcessor";
import { toast } from "sonner";
import { useDoubleTap } from "@/hooks/use-double-tap";
import { GoLiveCountdown } from "./GoLiveCountdown";
interface CreatorBroadcastFullscreenProps {
  creatorId: string;
}
export function CreatorBroadcastFullscreen({
  creatorId
}: CreatorBroadcastFullscreenProps) {
  const {
    isLive,
    state: liveState,
    goLive,
    canGoLive
  } = useLiveStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterPreset>('none');
  const [filteredStream, setFilteredStream] = useState<MediaStream | null>(null);
  const [isFilterReady, setIsFilterReady] = useState(false);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const filterProcessorRef = useRef(getFilterProcessor());
  const videoRef = useRef<HTMLVideoElement>(null);
  const isGoingLive = liveState === 'GOING_LIVE' as LiveState;

  // Double-tap handler for go-live
  const { onTapStart } = useDoubleTap({
    onDoubleTap: () => {
      if (isCountdownActive) {
        // Cancel countdown
        setIsCountdownActive(false);
        toast.info('Go live cancelled');
      } else if (!isLive && !isGoingLive) {
        // Start countdown
        setIsCountdownActive(true);
      } else if (isLive) {
        toast.info('Already broadcasting');
      }
    },
    delay: 400
  });

  // Initialize filter processor
  useEffect(() => {
    const processor = filterProcessorRef.current;
    
    processor.initialize().then(() => {
      console.log('[CreatorBroadcast] Filter processor initialized');
      setIsFilterReady(true);
    }).catch((error) => {
      console.error('[CreatorBroadcast] Filter initialization failed:', error);
      toast.error('Beauty filters unavailable', {
        description: 'Video will work without filters'
      });
      setIsFilterReady(true); // Continue without filters
    });

    return () => {
      if (filteredStream) {
        filteredStream.getTracks().forEach(track => track.stop());
      }
      processor.stop();
    };
  }, [filteredStream]);

  // Update video element when filtered stream changes
  useEffect(() => {
    if (videoRef.current && filteredStream) {
      videoRef.current.srcObject = filteredStream;
    }
  }, [filteredStream]);

  // Start camera immediately when filter is ready
  useEffect(() => {
    const startCamera = async () => {
      if (isFilterReady && !filteredStream) {
        try {
          console.log('[CreatorBroadcast] Starting camera...');
          // Get high-quality media stream
          const stream = await navigator.mediaDevices.getUserMedia({
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
          
          // Log actual resolution
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          console.log('[CreatorBroadcast] Camera started:', {
            resolution: `${settings.width}x${settings.height}`,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode
          });
          
          // Apply filter if not 'none'
          if (currentFilter !== 'none') {
            const processor = filterProcessorRef.current;
            const filtered = await processor.start(stream);
            setFilteredStream(filtered);
            console.log('[CreatorBroadcast] Filter applied to stream');
          } else {
            setFilteredStream(stream);
          }
        } catch (error) {
          console.error('[CreatorBroadcast] Failed to start camera:', error);
          toast.error('Camera access failed');
        }
      }
    };

    startCamera();
  }, [isFilterReady, currentFilter, filteredStream]);

  // Handle filter changes
  const handleFilterChange = async (filter: FilterPreset) => {
    console.log('[CreatorBroadcast] Filter changed to:', filter);
    setCurrentFilter(filter);
    
    if (filteredStream) {
      const processor = filterProcessorRef.current;
      
      if (filter === 'none') {
        // Stop filtering, use original stream
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
        processor.stop();
        setFilteredStream(originalStream);
      } else {
        // Apply new filter
        processor.setFilter(filter);
      }
    }
  };
  const handleCountdownComplete = async () => {
    setIsCountdownActive(false);
    try {
      await goLive();
    } catch (error) {
      console.error('[CreatorBroadcast] Failed to go live:', error);
      toast.error('Failed to go live');
    }
  };
  return <div className="relative h-full w-full bg-black rounded-2xl overflow-hidden">
      {/* Publisher (headless - only when live) */}
      {isLive && filteredStream && <LiveKitPublisher config={{
      role: 'publisher',
      creatorId,
      identity: creatorId
    }} mediaStream={filteredStream} publishAudio={true} publishVideo={true} onPublished={() => {
      console.log('[CreatorBroadcast] Stream published');
      setIsPublishing(true);
    }} onError={error => {
      console.error('[CreatorBroadcast] Publishing error:', error);
      setIsPublishing(false);
    }} />}

      {/* Local camera preview with filters */}
      <div 
        className="absolute inset-0 rounded-2xl overflow-hidden"
        onPointerDown={onTapStart}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-2xl"
        />
        
        {/* Fallback when no stream */}
        {!filteredStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="animate-pulse text-white text-lg mb-2">
                {isLive ? 'Starting camera...' : 'Camera preview'}
              </div>
              <div className="text-white/60 text-sm">
                {isLive ? 'Initializing camera and filters' : 'Tap GO LIVE to start broadcasting'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Countdown Overlay */}
      {isCountdownActive && (
        <GoLiveCountdown
          onComplete={handleCountdownComplete}
          onCancel={() => setIsCountdownActive(false)}
        />
      )}

      {/* Pulsing Green Border When Live */}
      {isLive && (
        <div className="absolute inset-0 pointer-events-none z-20 rounded-2xl">
          <div className="w-full h-full border-[2px] border-green-500 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* LIVE Indicator (only when live) */}
      {isLive && <div className="absolute left-4 z-20" style={{
      top: 'calc(env(safe-area-inset-top, 0px) + 16px)'
    }}>
          <Badge variant="destructive" className="px-3 py-1 text-sm font-bold animate-pulse">
            ● LIVE
          </Badge>
        </div>}

      {/* Filter Selector */}
      {isFilterReady && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <FilterSelector 
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* GO LIVE Button (only when not live) */}
      {!isLive}
    </div>;
}