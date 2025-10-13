import React, { useState, useEffect, useMemo } from "react";
import OverlayChat from "@/components/live/OverlayChat";
import { createOverlayConfig } from "@/lib/chatConfigs";
import { useExternalChatInput } from "@/hooks/useExternalChatInput";
import { LiveKitVideoPlayer } from "@/components/video/LiveKitVideoPlayer";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";

type Props = { creatorId: string };

export default function CreatorPreviewWithChat({ creatorId }: Props) {
  const [text, setText] = useState("");
  
  const chatConfig = createOverlayConfig(creatorId);
  const { sendExternalMessage, sending } = useExternalChatInput(chatConfig);

  useEffect(() => {
    console.log("[CreatorPreview] using creatorId:", creatorId, " (will subscribe to realtime:lobby-chat-" + creatorId + ")");
  }, [creatorId]);

  if (!creatorId) {
    console.warn("[CreatorPreviewWithChat] No creatorId available");
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Loading creator preview...</p>
        </div>
      </div>
    );
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    
    try {
      await sendExternalMessage(t);
      setText("");
    } catch (error) {
      console.error('[CreatorPreview] Failed to send message:', error);
    }
  }

  // Stabilize config objects to prevent unnecessary re-renders
  const publisherConfig = useMemo(() => ({
    role: 'publisher' as const,
    creatorId: creatorId,
    identity: creatorId,
  }), [creatorId]);

  const viewerConfig = useMemo(() => ({
    role: 'viewer' as const,
    creatorId: creatorId,
    identity: `${creatorId}_preview`,
  }), [creatorId]);

  return (
    <div className="w-full min-w-0 flex-1 flex flex-col">
      <div className="relative w-full flex-1 bg-black overflow-hidden rounded-xl">
        {/* Publish creator's camera */}
        <LiveKitPublisher
          config={publisherConfig}
          publishAudio={true}
          publishVideo={true}
        />

        {/* Display creator's own video */}
        <LiveKitVideoPlayer
          config={viewerConfig}
          className="w-full h-full object-cover"
          muted={true}
          fallbackContent={
            <div className="flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
                <p className="text-sm">Starting preview...</p>
              </div>
            </div>
          }
        />

        <OverlayChat creatorId={creatorId} />
      </div>
    </div>
  );
}
