import React from "react";
import { createSFU } from "@/lib/sfu";
import { getAuthJWT } from "@/lib/authToken";
import { RUNTIME } from "@/config/runtime";

// Construct the fixed functions URL once
const FUNCTIONS_URL = "https://ytqkunjxhtjsbpdrwsjf.functions.supabase.co/get_livekit_token";

// Debug logging functions
const dlog = (...args: any[]) => { if (RUNTIME.DEBUG_LOGS) console.log(...args); };
const dwarn = (...args: any[]) => { if (RUNTIME.DEBUG_LOGS) console.warn(...args); };

interface LobbyBroadcastPanelProps {
  onEnd?: () => void;
}

export default function LobbyBroadcastPanel(props: LobbyBroadcastPanelProps) {
  const [__sfuMsg, setSfuMsg] = React.useState<string>("panel mounted");
  const sfuRef = React.useRef<ReturnType<typeof createSFU> | null>(null);

  async function startSfuBroadcast() {
    if (RUNTIME.USE_SFU) {
      try {
        dlog("[CREATOR][SFU] start pressed");
        setSfuMsg("getting local tracks…");
        const sfu = createSFU();

        // 1) Get token
        setSfuMsg("requesting token…");
        const creatorId = (window as any)?.supabaseUser?.id || (window as any)?.__creatorId || (await (async () => {
          try { const { data } = await (await import("@/lib/supabaseClient")).supabase.auth.getUser(); return data?.user?.id; } catch { return undefined; }
        })());
        const identity = creatorId || crypto.randomUUID();
        if (!creatorId) dwarn("[CREATOR][SFU] creatorId not found; using identity only");

        const jwt = await getAuthJWT();

        const resp = await fetch(FUNCTIONS_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${jwt}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWt1bmp4aHRqc2JwZHJ3c2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODMwMzcsImV4cCI6MjA3MzU1OTAzN30.4cxQkkwnniFt5H4ToiNcpi6CxpXCpu4iiSTRUjDoBbw"
          },
          body: JSON.stringify({ role: "creator", creatorId, identity }),
        });
        const { token, url, error } = await resp.json();
        if (error) throw new Error(error);

        // 2) Connect to LiveKit
        setSfuMsg(`connecting ${url}…`);
        await sfu.connect(url, token);

        // Publish mic + camera (this also creates the local tracks)
        setSfuMsg("publishing tracks…");
        await sfu.publishCameraMic();

        // Attach creator preview to the local video track
        const pv = document.getElementById("creatorPreview") as HTMLVideoElement | null;
        try {
          const pubs = sfu.room.localParticipant.getTrackPublications();
          console.log("[CREATOR SFU] after publish pubs=", pubs.map(p => p.kind));

          const camPub = pubs.find(p => p.kind === "video");
          const camTrack = camPub?.track;
          if (pv && camTrack) {
            pv.muted = true;
            pv.playsInline = true;
            pv.autoplay = true;
            camTrack.attach(pv);
            pv.play?.().catch(() => {});
          } else {
            console.warn("[CREATOR SFU] preview attach skipped (pv or camTrack missing)");
          }
        } catch (e) {
          console.error("[CREATOR SFU] preview attach error", e);
        }

        sfuRef.current = sfu;
        if (RUNTIME.DEBUG_LOGS) (window as any).__creatorSFU = sfu;
        setSfuMsg("LIVE ✓");
        dlog("[CREATOR][SFU] LIVE");
        return; // skip legacy path
      } catch (e) {
        console.error("[CREATOR][SFU] publish failed", e);
        setSfuMsg(`error: ${String((e as Error)?.message || e)}`);
      }
    }
  }

  async function stopSfuBroadcast() {
    try {
      dlog("[CREATOR][SFU] stop pressed");
      setSfuMsg("stopping…");
      const sfu = sfuRef.current || (RUNTIME.DEBUG_LOGS ? (window as any).__creatorSFU : null);
      if (sfu) { await sfu.disconnect(); }
      sfuRef.current = null;
      if (RUNTIME.DEBUG_LOGS) (window as any).__creatorSFU = undefined;
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
