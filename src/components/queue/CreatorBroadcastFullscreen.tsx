import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";
import { useLiveStore } from "@/stores/live-store";
import type { LiveState } from "@/shared/types/live";
import { FilterSelector } from "./FilterSelector";
import { getFilterProcessor, type FilterPreset } from "@/lib/advancedFilterProcessor";
import { toast } from "sonner";
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
  const filterProcessorRef = useRef(getFilterProcessor());
  const videoRef = useRef<HTMLVideoElement>(null);
  const isGoingLive = liveState === 'GOING_LIVE' as LiveState;

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

  // Start filter processing when going live
  useEffect(() => {
    const startFiltering = async () => {
      if (isLive && isFilterReady) {
        try {
          // Get the original media stream
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 1280, height: 720 },
            audio: true
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
          console.error('[CreatorBroadcast] Failed to start filtering:', error);
          toast.error('Camera access failed');
        }
      }
    };

    startFiltering();
  }, [isLive, isFilterReady, currentFilter]);

  // Handle filter changes
  const handleFilterChange = async (filter: FilterPreset) => {
    console.log('[CreatorBroadcast] Filter changed to:', filter);
    setCurrentFilter(filter);
    
    if (filteredStream) {
      const processor = filterProcessorRef.current;
      
      if (filter === 'none') {
        // Stop filtering, use original stream
        const originalStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: true
        });
        processor.stop();
        setFilteredStream(originalStream);
      } else {
        // Apply new filter
        processor.setFilter(filter);
      }
    }
  };
  const handleGoLive = async () => {
    try {
      await goLive();
    } catch (error) {
      console.error('[CreatorBroadcast] Failed to go live:', error);
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
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
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