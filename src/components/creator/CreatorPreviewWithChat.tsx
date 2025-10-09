import React, { useState, useEffect, useRef } from "react";
import OverlayChat from "@/components/live/OverlayChat";
import { createOverlayConfig } from "@/lib/chatConfigs";
import { useExternalChatInput } from "@/hooks/useExternalChatInput";
import { LiveKitPublisher } from "@/components/video/LiveKitPublisher";
import { useLiveKitRoom } from "@/hooks/use-livekit-room";

type Props = { creatorId: string };

export default function CreatorPreviewWithChat({ creatorId }: Props) {
  const [text, setText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  
  const chatConfig = createOverlayConfig(creatorId);
  const { sendExternalMessage, sending } = useExternalChatInput(chatConfig);
  
  // Get room instance to access local tracks
  const { room, isConnected } = useLiveKitRoom({
    role: 'publisher',
    creatorId: creatorId,
    identity: creatorId,
  });

  useEffect(() => {
    console.log("[CreatorPreview] using creatorId:", creatorId, " (will subscribe to realtime:lobby-chat-" + creatorId + ")");
  }, [creatorId]);
  
  // Attach local video track to video element (no LiveKit round-trip)
  useEffect(() => {
    if (!room || !videoRef.current) return;
    
    const attachLocalVideo = () => {
      const localVideoTrack = room.localParticipant.videoTrackPublications.values().next().value?.track;
      
      if (localVideoTrack && videoRef.current) {
        console.log('[CreatorPreview] Attaching local video track');
        localVideoTrack.attach(videoRef.current);
        setHasLocalVideo(true);
      }
    };
    
    // Try immediately and on track published
    attachLocalVideo();
    
    const handleTrackPublished = () => attachLocalVideo();
    room.on('trackPublished', handleTrackPublished);
    
    return () => {
      room.off('trackPublished', handleTrackPublished);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [room]);

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

  return (
    <div className="w-full min-w-0 flex-1 flex flex-col">
      <div className="relative w-full flex-1 bg-black overflow-hidden rounded-xl">
        {/* Publish creator's camera (single connection only) */}
        <LiveKitPublisher
          config={{
            role: 'publisher',
            creatorId: creatorId,
            identity: creatorId,
          }}
          publishAudio={true}
          publishVideo={true}
          onPublished={() => {
            console.log('[CreatorPreview] Tracks published successfully');
          }}
        />

        {/* Display local video track directly (no network round-trip) */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ 
            transform: 'scaleX(-1)', // Mirror for natural preview
            opacity: hasLocalVideo ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {!hasLocalVideo && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black/80">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
              <p className="text-sm">Starting preview...</p>
            </div>
          </div>
        )}

        <OverlayChat creatorId={creatorId} />
      </div>
    </div>
  );
}
