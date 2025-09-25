import React from "react";
import { createSFU } from "@/lib/sfu";
import { fetchLiveKitToken } from "@/lib/livekitToken";
import { RUNTIME } from "@/config/runtime";

const USE_SFU = true;

let __creatorSFU: any;

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
      if (!__creatorSFU) {
        __creatorSFU = createSFU();
        
        // expose handle early so other components can subscribe to events
        (window as any).__creatorSFU = __creatorSFU;
        
        // add event relays right after createSFU
        __creatorSFU.room
          .on("connectionstatechanged", () => {
            try { window.dispatchEvent(new Event("sfu:creator:connected")); } catch {}
          })
          .on("localtrackpublished", () => {
            try { window.dispatchEvent(new Event("sfu:creator:published")); } catch {}
          });
      }
      
      const { supabase } = await import("@/lib/supabaseClient");
      const { data } = await supabase.auth.getUser();
      const identity = data?.user?.id || crypto.randomUUID();
      const creatorId = data?.user?.id!;
      const { token, url } = await fetchLiveKitToken({
        role: "creator",
        creatorId,
        identity,
      });
      
      // when LiveKit room connects
      await __creatorSFU.connect(url, token);
      try { window.dispatchEvent(new Event("sfu:creator:connected")); } catch {}
      
      // when local camera/mic are published
      await __creatorSFU.publishCameraMic();
      try { window.dispatchEvent(new Event("sfu:creator:published")); } catch {}
      
      const preview = document.getElementById("creator-preview") as HTMLVideoElement | null;
      if (preview) {
        preview.muted = true;
        preview.autoplay = true;
        preview.playsInline = true;
        const sfu = (window as any).__creatorSFU;
        const room = sfu?.room;
        const lp = room?.localParticipant;
        const camPub = lp?.videoTracks
          ? (Array.from(lp.videoTracks.values()).find((p: any) => p?.videoTrack) as any)?.videoTrack
          : null;
        if (camPub) camPub.attach(preview);
      }
      setIsBroadcasting?.(true);
      setSfuMsg("LIVE ✓");
      console.log("[CREATOR SFU] publishing");
      return;
    } catch (e) {
      console.error("[CREATOR SFU] failed", e);
      setSfuMsg(`error: ${String((e as Error)?.message || e)}`);
      setIsBroadcasting?.(false);
    }
  }

  async function stopSfuBroadcast() {
    if (USE_SFU) {
      try { await __creatorSFU?.disconnect(); } catch {}
      __creatorSFU = undefined;
      setIsBroadcasting?.(false);
      setSfuMsg("stopped");
      console.log("[CREATOR SFU] stopped");
      return;
    }
  }

  // expose to DevTools just in case (debug only)
  React.useEffect(() => {
    if (RUNTIME.DEBUG_LOGS) {
      (window as any).__creatorStartSFU = startSfuBroadcast;
      (window as any).__creatorStopSFU = stopSfuBroadcast;
    }
    dlog("[CREATOR][SFU] panel mounted (v1)");
    return () => {
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
    </div>
  );
}