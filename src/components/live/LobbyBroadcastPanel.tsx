import React from "react";
import { createSFU } from "@/lib/sfu";
import { fetchLiveKitToken } from "@/lib/livekitToken";
import { RUNTIME } from "@/config/runtime";

const USE_SFU = true;

let __creatorSFU: ReturnType<typeof createSFU> | null = null;

// Debug logging functions
const dlog = (...args: any[]) => { if (RUNTIME.DEBUG_LOGS) console.log(...args); };
const dwarn = (...args: any[]) => { if (RUNTIME.DEBUG_LOGS) console.warn(...args); };

interface LobbyBroadcastPanelProps {
  onEnd?: () => void;
  setIsBroadcasting?: (broadcasting: boolean) => void;
}

export default function LobbyBroadcastPanel({ onEnd, setIsBroadcasting }: LobbyBroadcastPanelProps) {
  const [__sfuMsg, setSfuMsg] = React.useState<string>("panel mounted");
  const sfuRef = React.useRef<ReturnType<typeof createSFU> | null>(null);

  async function startSfuBroadcast() {
    if (!USE_SFU) return;
    try {
      dlog("[CREATOR SFU] Starting broadcast...");
      
      if (!__creatorSFU) {
        __creatorSFU = createSFU();
        sfuRef.current = __creatorSFU;
        
        // expose handle early so other components can subscribe to events
        (window as any).__creatorSFU = __creatorSFU;
        
        // add event relays and track listeners
        __creatorSFU.room
          .on("connectionStateChanged", (state) => {
            dlog("[CREATOR SFU] Connection state:", state);
            try { window.dispatchEvent(new Event("sfu:creator:connected")); } catch {}
          })
          .on("trackPublished", (publication) => {
            dlog("[CREATOR SFU] Track published:", publication.kind);
            try { window.dispatchEvent(new Event("sfu:creator:published")); } catch {}
            
            // Attach video track to preview when published
            if (publication.kind === "video") {
              attachVideoTrack();
            }
          })
          .on("trackUnpublished", (publication) => {
            dwarn("[CREATOR SFU] Track unpublished:", publication.kind);
          })
          .on("disconnected", () => {
            dwarn("[CREATOR SFU] Room disconnected");
            setIsBroadcasting?.(false);
            setSfuMsg("Disconnected");
          });
      }
      
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getUser();
      const identity = data?.user?.id || crypto.randomUUID();
      const creatorId = data?.user?.id!;
      
      dlog("[CREATOR SFU] Fetching token for:", creatorId);
      const { token, url } = await fetchLiveKitToken({
        role: "publisher",
        creatorId,
        identity,
      });
      
      // when LiveKit room connects
      dlog("[CREATOR SFU] Connecting to LiveKit...");
      await __creatorSFU.connect(url, token);
      try { window.dispatchEvent(new Event("sfu:creator:connected")); } catch {}
      
      // when local camera/mic are published
      dlog("[CREATOR SFU] Publishing camera/mic...");
      await __creatorSFU.publishCameraMic();
      try { window.dispatchEvent(new Event("sfu:creator:published")); } catch {}
      
      // Attach video track immediately after publishing
      attachVideoTrack();
      
      setIsBroadcasting?.(true);
      setSfuMsg("LIVE ✓");
      dlog("[CREATOR SFU] Broadcasting successfully started");
      return;
    } catch (e) {
      console.error("[CREATOR SFU] failed", e);
      setSfuMsg(`error: ${String((e as Error)?.message || e)}`);
      setIsBroadcasting?.(false);
    }
  }

  function attachVideoTrack() {
    try {
      const preview = document.getElementById("creator-preview") as HTMLVideoElement | null;
      if (!preview) {
        dwarn("[CREATOR SFU] Preview element not found");
        return;
      }

      const sfu = __creatorSFU || (window as any).__creatorSFU;
      if (!sfu?.room?.localParticipant) {
        dwarn("[CREATOR SFU] No local participant yet");
        return;
      }

      const lp = sfu.room.localParticipant;
      const videoTrackPub = Array.from(lp.videoTrackPublications.values())[0] as any;
      
      if (!videoTrackPub?.videoTrack) {
        dwarn("[CREATOR SFU] No video track available");
        return;
      }

      // Detach any existing tracks first
      preview.srcObject = null;
      
      // Configure video element
      preview.muted = true;
      preview.autoplay = true;
      preview.playsInline = true;
      
      // Attach the track
      videoTrackPub.videoTrack.attach(preview);
      dlog("[CREATOR SFU] Video track attached successfully");
      
      // Handle track ended
      videoTrackPub.videoTrack.once("ended", () => {
        dwarn("[CREATOR SFU] Video track ended, attempting re-attach...");
        setTimeout(() => attachVideoTrack(), 1000);
      });
      
    } catch (e) {
      console.error("[CREATOR SFU] Error attaching video track:", e);
    }
  }

  async function stopSfuBroadcast() {
    if (USE_SFU) {
      dlog("[CREATOR SFU] Stopping broadcast...");
      try { 
        await __creatorSFU?.disconnect(); 
        
        // Clean up preview element
        const preview = document.getElementById("creator-preview") as HTMLVideoElement | null;
        if (preview) {
          preview.srcObject = null;
        }
      } catch (e) {
        console.error("[CREATOR SFU] Error stopping:", e);
      }
      __creatorSFU = null;
      sfuRef.current = null;
      delete (window as any).__creatorSFU;
      setIsBroadcasting?.(false);
      setSfuMsg("stopped");
      dlog("[CREATOR SFU] stopped");
      return;
    }
  }

  // expose to DevTools just in case (debug only)
  React.useEffect(() => {
    if (RUNTIME.DEBUG_LOGS) {
      (window as any).__creatorStartSFU = startSfuBroadcast;
      (window as any).__creatorStopSFU = stopSfuBroadcast;
    }
    dlog("[CREATOR][SFU] panel mounted (v2 - improved)");
    return () => {
      // Cleanup on unmount
      if (sfuRef.current) {
        dlog("[CREATOR][SFU] Cleaning up on unmount");
        stopSfuBroadcast();
      }
      if (RUNTIME.DEBUG_LOGS) {
        delete (window as any).__creatorStartSFU;
        delete (window as any).__creatorStopSFU;
      }
    };
  }, []);

  // always render the overlay so we can click it no matter what the rest of the UI does
  return (
    <div className="fixed inset-4 z-[99998] flex flex-col gap-4 max-w-sm ml-auto">
      {/* Creator camera preview (always rendered) */}
      <div className="w-full max-w-xl aspect-video bg-black/80 rounded-xl overflow-hidden">
        <video id="creator-preview" className="w-full h-full object-cover" autoPlay playsInline muted />
      </div>
      
      {/* SFU Control Panel */}
      <div className="bg-black/85 text-white p-3 rounded-xl font-mono text-sm">
        <div className="font-bold mb-2">SFU Control</div>
        <div className="text-xs leading-relaxed min-h-9 whitespace-pre-wrap mb-3">
          {__sfuMsg}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={startSfuBroadcast}
            className="flex-1 px-3 py-2 rounded-lg border border-green-400 bg-green-900/40 text-green-400 hover:bg-green-900/60 cursor-pointer"
          >
            Start SFU
          </button>
          <button 
            onClick={stopSfuBroadcast}
            className="flex-1 px-3 py-2 rounded-lg border border-red-400 bg-red-900/40 text-red-400 hover:bg-red-900/60 cursor-pointer"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}