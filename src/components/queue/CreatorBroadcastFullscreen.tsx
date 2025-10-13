import { useRef, useEffect, useState, useMemo } from "react";
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
import DebugHUD from "@/components/dev/DebugHUD";
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
  
  // Debug HUD state
  const [debugState, setDebugState] = useState({
    connectionState: 'idle',
    tokenStatus: 'pending',
    tokenUrl: '',
    tokenRoom: '',
    error: null as string | null,
  });
  
  // Use new broadcast hook - handles all media lifecycle
  const broadcast = useLobbyBroadcast({ isVisible });
  
  // Stable publisher config
  const publisherConfig = useRef({
    role: 'publisher' as const,
    creatorId,
    identity: creatorId,
    roomName: lobbyRoomName(creatorId)
  }).current;

  // Listen to LiveKit events for debug HUD (filter for publisher role only)
  useEffect(() => {
    const handleTokenEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      
      // Only update HUD for publisher tokens (ignore viewer tokens from NextUserPreview)
      if (detail.role === 'publisher' || detail.room?.startsWith('lobby_')) {
        setDebugState(prev => ({
          ...prev,
          tokenStatus: 'OK',
          tokenUrl: detail.url || '',
          tokenRoom: detail.room || '',
        }));
      }
    };

    const handleStateEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setDebugState(prev => ({
        ...prev,
        connectionState: detail.connectionState || 'unknown',
        error: detail.error,
      }));
    };

    window.addEventListener('lk:token', handleTokenEvent);
    window.addEventListener('lk:state', handleStateEvent);

    return () => {
      window.removeEventListener('lk:token', handleTokenEvent);
      window.removeEventListener('lk:state', handleStateEvent);
    };
  }, []);

  // Log broadcast state changes
  useEffect(() => {
    console.log('[CreatorBroadcast] 📊 Broadcast state changed:', {
      hasStream: !!broadcast.stream,
      streamTracks: broadcast.stream?.getTracks().length || 0,
      isStreaming: broadcast.isStreaming,
      isCountdownActive: broadcast.isCountdownActive,
      isFilterReady: broadcast.isFilterReady,
      currentFilter: broadcast.currentFilter,
      isLobbyBroadcasting
    })
  }, [broadcast.stream, broadcast.isStreaming, broadcast.isCountdownActive, isLobbyBroadcasting])

  // Double-tap handler for go-live
  const { onTapStart } = useDoubleTap({
    onDoubleTap: () => {
      console.log('[CreatorBroadcast] 🖐️ Double-tap detected', {
        isCountdownActive: broadcast.isCountdownActive,
        isLobbyBroadcasting,
        hasStream: !!broadcast.stream
      })
      
      if (broadcast.isCountdownActive) {
        console.log('[CreatorBroadcast] ❌ Canceling countdown')
        broadcast.cancelCountdown();
        toast.info('Go live cancelled');
      } else if (!isLobbyBroadcasting) {
        console.log('[CreatorBroadcast] ▶️ Starting countdown')
        broadcast.startCountdown();
      } else {
        console.log('[CreatorBroadcast] ⏹️ Ending broadcast')
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
    console.log('[CreatorBroadcast] 🎉 Countdown completed - going live!', {
      hasStream: !!broadcast.stream,
      streamTracks: broadcast.stream?.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      }))
    })
    
    broadcast.completeCountdown();
    setLobbyBroadcasting(true);
    console.log('[CreatorBroadcast] ✅ Lobby broadcasting state set to TRUE')
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
      {/* Debug HUD (dev mode only) */}
      {import.meta.env.DEV && (
        <DebugHUD
          title="LiveKit Connection"
          rows={[
            ['State', debugState.connectionState],
            ['Token', debugState.tokenStatus],
            ['URL', debugState.tokenUrl ? debugState.tokenUrl.substring(0, 30) + '...' : 'N/A'],
            ['Room', debugState.tokenRoom || 'N/A'],
            ['Role', 'publisher'],
            ['Identity', creatorId.substring(0, 8) + '...'],
            ['Error', debugState.error || 'None'],
          ]}
        />
      )}

      {/* Publisher (headless - only when broadcasting) */}
      {isLobbyBroadcasting && broadcast.stream && (
        <LiveKitPublisher 
          config={publisherConfig}
          mediaStream={broadcast.stream} 
          publishAudio={true} 
          publishVideo={true} 
          onPublished={() => {
            console.log('[CreatorBroadcast] Stream published');
          }} 
          onError={error => {
            console.error('[CreatorBroadcast] Publishing error:', error);
          }} 
        />
      )}

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