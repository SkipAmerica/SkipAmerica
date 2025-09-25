import React, { useRef, useEffect } from "react";
import { createSFU } from "@/lib/sfu";
import { fetchLiveKitToken, getIdentity } from "@/lib/sfuToken";
import { useAuth } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";

const USE_SFU = true;
let __creatorSFU: ReturnType<typeof createSFU> | undefined;

type Props = { onEnd?: () => void };

export default function LobbyBroadcastPanel({ onEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // ensure preview element is present
    if (!videoRef.current) {
      const el = document.getElementById("creator-preview") as HTMLVideoElement | null;
      // attach later after publish
    }
  }, []);

  async function startBroadcast() {
    if (!USE_SFU) return;
    try {
      console.log("[CREATOR UI] startBroadcast clicked");
      if (!__creatorSFU) __creatorSFU = createSFU();
      const identity = getIdentity(user?.id);
      const creatorId = user?.id!;
      
      // Fetch LiveKit token using Supabase Functions SDK
      const { token, url } = await fetchLiveKitToken({
        role: "creator",
        creatorId,
        identity,
      });
      
      await __creatorSFU.connect(url, token);
      await __creatorSFU.publishCameraMic();
      
      // attach local video to preview
      const preview = (document.getElementById("creator-preview") as HTMLVideoElement) || videoRef.current;
      // Get the video track from local participant
      const videoPublication = Array.from(__creatorSFU.room.localParticipant.videoTrackPublications.values())[0];
      if (preview && videoPublication?.videoTrack) { 
        preview.autoplay = true; 
        preview.playsInline = true; 
        preview.muted = true; 
        videoPublication.videoTrack.attach(preview); 
      }
      console.log("[CREATOR SFU] publishing");
    } catch (e) {
      console.error("[CREATOR SFU] start failed", e);
    }
  }

  async function stopBroadcast() {
    try { 
      console.log("[CREATOR UI] stopBroadcast clicked"); 
      await __creatorSFU?.disconnect(); 
    } catch {}
    __creatorSFU = undefined; 
    onEnd?.(); 
    console.log("[CREATOR SFU] stopped");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden bg-secondary/20">
        <video 
          id="creator-preview" 
          ref={videoRef} 
          className="w-full aspect-video bg-secondary/10" 
          autoPlay 
          playsInline 
          muted 
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={startBroadcast} className="flex-1">
          Start Broadcast
        </Button>
        <Button onClick={stopBroadcast} variant="outline" className="flex-1">
          Stop
        </Button>
      </div>
    </div>
  );
}