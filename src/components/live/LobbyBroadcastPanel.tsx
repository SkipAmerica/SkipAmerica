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
      if (!__creatorSFU) __creatorSFU = createSFU();
      const { supabase } = await import("@/lib/supabaseClient");
      const { data } = await supabase.auth.getUser();
      const identity = data?.user?.id || crypto.randomUUID();
      const creatorId = data?.user?.id!;
      const { token, url } = await fetchLiveKitToken({
        role: "creator",
        creatorId,
        identity,
      });
      await __creatorSFU.connect(url, token);
      await __creatorSFU.publishCameraMic();
      const preview = document.getElementById("creator-preview") as HTMLVideoElement | null;
      if (preview) {
        preview.muted = true;
        preview.autoplay = true;
        preview.playsInline = true;
        const camPub = __creatorSFU.room.localParticipant.videoTracks.values().next().value?.videoTrack;
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