import React from "react";
import { createSFU } from "@/lib/sfu";
import { getAuthJWT } from "@/lib/authToken";
import { RUNTIME } from "@/config/runtime";

const USE_SFU = true; // Force SFU for now

// Construct the fixed functions URL once
const FUNCTIONS_URL = "https://ytqkunjxhtjsbpdrwsjf.functions.supabase.co/get_livekit_token";

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
    if (USE_SFU) {
      try {
        console.log("[CREATOR SFU] starting…");
        const sfu = createSFU();
        (window as any).__creatorSFU = sfu;

        // Optional preview: render local video to preview element
        const pv = document.getElementById("creatorPreview") as HTMLVideoElement | null;
        if (pv) sfu.attachRemoteVideoTo(pv);

        // === GET TOKEN FROM EDGE FUNCTION ===
        const creatorId = (window as any)?.supabaseUser?.id || (window as any)?.__creatorId || (await (async () => {
          try { const { data } = await (await import("@/lib/supabaseClient")).supabase.auth.getUser(); return data?.user?.id; } catch { return undefined; }
        })());
        const identity = creatorId || crypto.randomUUID();

        // Fetch token for role "creator" (canPublish=true from the Edge Function)
        const { supabase } = await import("@/lib/supabaseClient");
        const session = (await supabase.auth.getSession()).data.session;
        const resp = await fetch(FUNCTIONS_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({ role: "creator", creatorId, identity }),
        });
        const dbgTxt = await resp.clone().text().catch(()=>"(no body)");
        console.log("[CREATOR SFU] token http", resp.status, dbgTxt.slice(0,200)+"…");
        if (!resp.ok) throw new Error(`token http ${resp.status}`);

        const { token, url, room } = JSON.parse(dbgTxt || "{}");
        console.log("[CREATOR SFU] parsed", { tokenLen: token?.length, url, room });
        if (!url || !/^wss:\/\//.test(url)) throw new Error(`bad livekit url: ${url}`);

        // === CONNECT & PUBLISH CAMERA/MIC ===
        await sfu.connect(url, token);
        await sfu.publishCameraMic();
        console.log("[CREATOR SFU] published camera and microphone");

        // Set UI broadcasting state
        setIsBroadcasting?.(true);
        setSfuMsg("LIVE ✓");
        return; // skip legacy path
      } catch (e) {
        console.error("[CREATOR SFU] start failed", e);
        setSfuMsg(`error: ${String((e as Error)?.message || e)}`);
        setIsBroadcasting?.(false);
      }
    }
  }

  async function stopSfuBroadcast() {
    try {
      dlog("[CREATOR][SFU] stop pressed");
      setSfuMsg("stopping…");
      const sfu = (window as any).__creatorSFU;
      if (sfu) { 
        try { await sfu.disconnect(); } catch {} 
        (window as any).__creatorSFU = undefined; 
      }
      setIsBroadcasting?.(false);
      setSfuMsg("stopped");
    } catch (e) {
      dwarn("[CREATOR][SFU] stop error", e);
      setSfuMsg(`stop error: ${String((e as Error)?.message || e)}`);
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
        <video
          id="creatorPreview"
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
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