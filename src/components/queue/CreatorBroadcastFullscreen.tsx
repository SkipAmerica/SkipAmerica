import { useRef, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";
import { useLiveStore } from "@/stores/live-store";
import { FilterSelector } from "./FilterSelector";
import { BeautyToggles } from "./BeautyToggles";
import type { FilterPreset } from "@/lib/advancedFilterProcessor";
import { toast } from "sonner";
import { useDoubleTap } from "@/hooks/use-double-tap";
import { GoLiveCountdown } from "./GoLiveCountdown";
import { useLobbyBroadcast } from "@/hooks/broadcast/useLobbyBroadcast";
import { lobbyRoomName } from "@/lib/lobbyIdentity";
interface CreatorBroadcastFullscreenProps {
  creatorId: string;
  isVisible?: boolean;
}
export function CreatorBroadcastFullscreen({
  creatorId,
  isVisible = true
}: CreatorBroadcastFullscreenProps) {
  const { isLobbyBroadcasting, setLobbyBroadcasting } = useLiveStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  // const [eyeEnhanceEnabled, setEyeEnhanceEnabled] = useState(true);
  // const [teethWhitenEnabled, setTeethWhitenEnabled] = useState(true);
  
  // Use new broadcast hook - handles all media lifecycle
  const broadcast = useLobbyBroadcast({ isVisible });

  // Double-tap handler for go-live
  const { onTapStart } = useDoubleTap({
    onDoubleTap: () => {
      if (broadcast.isCountdownActive) {
        broadcast.cancelCountdown();
        toast.info('Go live cancelled');
      } else if (!isLobbyBroadcasting) {
        broadcast.startCountdown();
      } else {
        setLobbyBroadcasting(false);
        broadcast.stopStream();
        toast.success('Broadcast ended');
      }
    },
    delay: 400
  });

  // Update video element reactively when stream changes
  useEffect(() => {
    if (videoRef.current && broadcast.stream) {
      videoRef.current.srcObject = broadcast.stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [broadcast.stream]);

  // Listen for end broadcast command from LSB
  useEffect(() => {
    const handleEndBroadcast = () => {
      console.log('[CreatorBroadcast] Received end broadcast command');
      if (isLobbyBroadcasting) {
        setLobbyBroadcasting(false);
        broadcast.stopStream();
        toast.success('Broadcast ended');
      }
    };

    window.addEventListener('end-broadcast', handleEndBroadcast);
    return () => window.removeEventListener('end-broadcast', handleEndBroadcast);
  }, [isLobbyBroadcasting, broadcast, setLobbyBroadcasting]);

  // Handle filter changes
  const handleFilterChange = async (filter: FilterPreset) => {
    await broadcast.changeFilter(filter);
  };

  const handleCountdownComplete = () => {
    broadcast.completeCountdown();
    setLobbyBroadcasting(true);
    toast.success('Now broadcasting to your lobby');
  };

  // const handleEyeEnhanceToggle = (enabled: boolean) => {
  //   setEyeEnhanceEnabled(enabled);
  //   broadcast.setEyeEnhance(enabled);
  // };

  // const handleTeethWhitenToggle = (enabled: boolean) => {
  //   setTeethWhitenEnabled(enabled);
  //   broadcast.setTeethWhiten(enabled);
  // };
  return <div className="relative h-full w-full bg-black rounded-2xl overflow-hidden">
      {/* Publisher (headless - only when broadcasting) */}
      {isLobbyBroadcasting && broadcast.stream && (() => {
        const publisherConfig = {
          role: 'publisher' as const,
          creatorId,
          identity: creatorId,
          roomName: lobbyRoomName(creatorId)
        };
        console.log('[CreatorBroadcast] 🎙️ PUBLISHER CONFIG:', {
          ...publisherConfig,
          hasStream: !!broadcast.stream,
          streamTracks: broadcast.stream.getTracks().length,
          timestamp: new Date().toISOString()
        });
        return <LiveKitPublisher config={publisherConfig} mediaStream={broadcast.stream} publishAudio={true} publishVideo={true} onPublished={() => {
          console.log('[CreatorBroadcast] Stream published');
        }} onError={error => {
          console.error('[CreatorBroadcast] Publishing error:', error);
        }} />;
      })()}

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
        {!broadcast.stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="animate-pulse text-white text-lg mb-2">
                {isLobbyBroadcasting ? 'Starting camera...' : 'Camera preview'}
              </div>
              <div className="text-white/60 text-sm">
                {isLobbyBroadcasting ? 'Initializing camera and filters' : 'Double-tap to start broadcasting'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Countdown Overlay */}
      {broadcast.isCountdownActive && (
        <GoLiveCountdown
          key={broadcast.isCountdownActive ? 'active' : 'inactive'}
          onComplete={handleCountdownComplete}
          onCancel={() => broadcast.cancelCountdown()}
        />
      )}

      {/* Pulsing Green Border When Broadcasting */}
      {isLobbyBroadcasting && (
        <div className="absolute inset-0 pointer-events-none z-20 rounded-2xl">
          <div className="w-full h-full border-[10px] border-green-500 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* LIVE Indicator (only when broadcasting) */}
      {isLobbyBroadcasting && <div className="absolute left-4 z-20" style={{
      top: 'calc(env(safe-area-inset-top, 0px) + 16px)'
    }}>
          <Badge variant="destructive" className="px-3 py-1 text-sm font-bold animate-pulse">
            ● LIVE
          </Badge>
        </div>}

      {/* Status Text Overlay */}
      <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm font-medium text-center">
            {isLobbyBroadcasting ? (
              <>You are live • Double-tap to go offline</>
            ) : (
              <>Double-tap to go live</>
            )}
          </p>
        </div>
      </div>

      {/* Beauty Toggles - DISABLED */}
      {/* broadcast.isFilterReady && (
        <div className="absolute bottom-32 left-4 right-4 z-20">
          <BeautyToggles
            eyeEnhance={eyeEnhanceEnabled}
            teethWhiten={teethWhitenEnabled}
            onEyeEnhanceToggle={handleEyeEnhanceToggle}
            onTeethWhitenToggle={handleTeethWhitenToggle}
          />
        </div>
      ) */}

      {/* Filter Selector */}
      {broadcast.isFilterReady && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <FilterSelector 
            currentFilter={broadcast.currentFilter}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* GO LIVE Button (only when not broadcasting) */}
      {!isLobbyBroadcasting}
    </div>;
}