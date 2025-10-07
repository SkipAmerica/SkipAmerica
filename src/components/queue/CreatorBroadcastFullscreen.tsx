import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalChat } from "@/components/chat/UniversalChat";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";
import { LiveKitVideoPlayer } from "@/components/video/LiveKitVideoPlayer";
import { createFullscreenLobbyConfig } from "@/lib/chatConfigs";

interface CreatorBroadcastFullscreenProps {
  creatorId: string;
  onClose: () => void;
}

export function CreatorBroadcastFullscreen({
  creatorId,
  onClose,
}: CreatorBroadcastFullscreenProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const lobbyConfig = createFullscreenLobbyConfig(creatorId);

  return (
    <div className="relative h-full w-full bg-black">
      {/* Publisher (headless - publishes creator stream to room) */}
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
                Starting broadcast...
              </div>
              <div className="text-white/60 text-sm">
                Camera and microphone initializing
              </div>
            </div>
          </div>
        }
      />

      {/* LIVE Indicator */}
      <div className="absolute top-4 left-4 z-20">
        <Badge variant="destructive" className="px-3 py-1 text-sm font-bold">
          LIVE
        </Badge>
      </div>

      {/* Close Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 z-20 bg-black/40 border-white/20 text-white hover:bg-black/60 hover:text-white backdrop-blur-sm"
        onClick={onClose}
        data-no-drag
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Lobby Chat Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[50vh] overflow-hidden">
        <UniversalChat config={lobbyConfig} />
      </div>
    </div>
  );
}
