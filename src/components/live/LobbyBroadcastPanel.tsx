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

        // 1) Get local tracks once
        const { createLocalTracks } = await import("livekit-client");
        const localTracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } });

        // 2) Attach camera to preview element
        const pv = document.getElementById("creatorPreview") as HTMLVideoElement | null;
        if (pv) {
          // detach anything first
          pv.srcObject = null;
          const MediaStreamCls = (window as any).MediaStream;
          const ms = new MediaStreamCls(localTracks.filter(t => t.kind === "video").map(t => t.mediaStreamTrack));
          pv.srcObject = ms;
          try { await pv.play(); } catch {}
        }

        // 3) Get token
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

        // 4) Connect room then publish the tracks
        setSfuMsg(`connecting ${url}…`);
        await sfu.connect(url, token);
        setSfuMsg("publishing tracks…");
        for (const t of localTracks) {
          await sfu.room.localParticipant.publishTrack(t);
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
    <>
      {/* Local Preview Video */}
      <video 
        id="creatorPreview" 
        muted 
        playsInline 
        autoPlay 
        className="w-full rounded-lg bg-black" 
        style={{
          position: "fixed", 
          top: 12, 
          right: 12, 
          zIndex: 99998,
          width: 320, 
          height: 240,
          boxShadow: "0 8px 20px rgba(0,0,0,.35)"
        }}
      />
      
      <div style={{
        position: "fixed", right: 12, bottom: 12, zIndex: 99999,
        background: "rgba(0,0,0,.85)", color: "#fff",
        padding: "12px 14px", borderRadius: 12, fontFamily: "monospace",
        width: 320, boxShadow: "0 8px 20px rgba(0,0,0,.35)"
      }}>
        <div style={{fontWeight: 700, marginBottom: 6}}>SFU Control</div>
        <div style={{fontSize: 12, lineHeight: "18px", minHeight: 36, whiteSpace: "pre-wrap"}}>
          {__sfuMsg}
        </div>
        <div style={{display: "flex", gap: 8, marginTop: 8}}>
          <button onClick={startSfuBroadcast}
            style={{flex:1, padding:"8px 10px", borderRadius:8, border:"1px solid #3fa", background:"#124", color:"#3fa", cursor:"pointer"}}>
            Start SFU
          </button>
          <button onClick={stopSfuBroadcast}
            style={{flex:1, padding:"8px 10px", borderRadius:8, border:"1px solid #f66", background:"#411", color:"#f66", cursor:"pointer"}}>
            Stop
          </button>
        </div>
      </div>
    </>
  );
}
