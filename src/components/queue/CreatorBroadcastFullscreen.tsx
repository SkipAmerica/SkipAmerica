import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";
import { LiveKitVideoPlayer } from "@/components/video/LiveKitVideoPlayer";
import { useLiveStore } from "@/stores/live-store";
import type { LiveState } from "@/shared/types/live";

interface CreatorBroadcastFullscreenProps {
  creatorId: string;
}

export function CreatorBroadcastFullscreen({
  creatorId,
}: CreatorBroadcastFullscreenProps) {
  const { isLive, state: liveState, goLive, canGoLive } = useLiveStore();
  const [isPublishing, setIsPublishing] = useState(false);
  
  const isGoingLive = liveState === 'GOING_LIVE' as LiveState;

  const handleGoLive = async () => {
    try {
      await goLive();
    } catch (error) {
      console.error('[CreatorBroadcast] Failed to go live:', error);
    }
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Publisher (headless - only when live) */}
      {isLive && (
        <LiveKitPublisher
          config={{
            role: 'publisher',
            creatorId,
            identity: creatorId,
          }}
          publishAudio={true}
          publishVideo={true}
          onPublished={() => {
            console.log('[CreatorBroadcast] Stream published');
            setIsPublishing(true);
          }}
          onError={(error) => {
            console.error('[CreatorBroadcast] Publishing error:', error);
            setIsPublishing(false);
          }}
        />
      )}

      {/* Video Player (shows creator's own stream fullscreen) */}
      <LiveKitVideoPlayer
        config={{
          role: 'viewer',
          creatorId,
          identity: `viewer_${creatorId}_self`,
        }}
        targetParticipantId={creatorId}
        className="absolute inset-0 w-full h-full object-cover"
        muted={true}
        fallbackContent={
          <div className="flex items-center justify-center h-full bg-black/80">
            <div className="text-center">
              <div className="animate-pulse text-white text-lg mb-2">
                {isLive ? 'Starting broadcast...' : 'Camera preview'}
              </div>
              <div className="text-white/60 text-sm">
                {isLive ? 'Camera and microphone initializing' : 'Tap GO LIVE to start broadcasting'}
              </div>
            </div>
          </div>
        }
      />

      {/* LIVE Indicator (only when live) */}
      {isLive && (
        <div 
          className="absolute left-4 z-20" 
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <Badge variant="destructive" className="px-3 py-1 text-sm font-bold animate-pulse">
            ● LIVE
          </Badge>
        </div>
      )}

      {/* GO LIVE Button (only when not live) */}
      {!isLive && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
        >
          <button
            onClick={handleGoLive}
            disabled={!canGoLive || isGoingLive}
            className="relative w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 
                       disabled:bg-gray-400 transition-all duration-200
                       shadow-[0_0_20px_rgba(239,68,68,0.5)]
                       active:scale-95"
          >
            <div className="absolute inset-2 rounded-full border-4 border-white" />
          </button>
          <span className="text-white text-sm font-semibold">
            {isGoingLive ? 'Starting...' : 'GO LIVE'}
          </span>
        </div>
      )}
    </div>
  );
}
