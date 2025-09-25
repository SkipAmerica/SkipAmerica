import React from "react";

const USE_SFU = true;
import { createSFU } from "@/lib/sfu";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/auth-provider";
import { RUNTIME } from "@/config/runtime";

// use explicit Supabase Functions URL (replace with your project ref if different)
const TOKEN_ENDPOINT = "https://ytqkunjxhtjsbpdrwsjf.functions.supabase.co/get_livekit_token";

async function getLiveKitToken(role: "creator" | "viewer", creatorId: string, identity: string) {
  const session = (await supabase.auth.getSession()).data.session;
  const headers: Record<string,string> = { "content-type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const body = JSON.stringify({ role, creatorId, identity });

  console.log("[SFU] POST", TOKEN_ENDPOINT, body);
  const resp = await fetch(TOKEN_ENDPOINT, { method: "POST", headers, body });
  const raw = await resp.text();
  console.log("[SFU] resp", resp.status, raw.slice(0, 200) + (raw.length > 200 ? "…" : ""));

  if (!resp.ok) throw new Error(`token http ${resp.status}`);

  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`expected JSON, got "${ct}"`);
  }

  let parsed: any;
  try { parsed = JSON.parse(raw); } catch {
    throw new Error("invalid JSON from token endpoint");
  }
  const { token, url, error } = parsed || {};
  if (error) throw new Error(error);
  if (!url || !/^wss:\/\//.test(url)) throw new Error(`bad livekit url: ${url}`);
  if (!token) throw new Error("missing token");
  return { token, url };
}

// Debug logging functions
const dlog = (...args: any[]) => { if (RUNTIME.DEBUG_LOGS) console.log(...args); };
const dwarn = (...args: any[]) => { if (RUNTIME.DEBUG_LOGS) console.warn(...args); };

interface LobbyBroadcastPanelProps {
  onEnd?: () => void;
  setIsBroadcasting?: (broadcasting: boolean) => void;
}

export default function LobbyBroadcastPanel({ onEnd, setIsBroadcasting }: LobbyBroadcastPanelProps) {
  const { user } = useAuth();
  const [__sfuMsg, setSfuMsg] = React.useState<string>("panel mounted");
  const sfuRef = React.useRef<ReturnType<typeof createSFU> | null>(null);

  async function confirmJoin() {
    if (USE_SFU) {
      try {
        console.log("[CREATOR SFU] start");
        const sfu = createSFU();

        // 1) Create local tracks & attach preview immediately
        const tracks = await sfu.createLocalAV();
        const pv = document.getElementById("creatorPreview") as HTMLVideoElement | null;
        const vtrack = tracks.find(t => t.kind === "video");
        if (pv && vtrack) { vtrack.attach(pv); pv.play?.().catch(()=>{}); console.log("[CREATOR SFU] preview attached"); }

        // 2) Get token
        const creatorId = user?.id!;
        const identity = user?.id!;
        const { token, url } = await getLiveKitToken("creator", creatorId, identity);

        // 3) Connect & publish
        sfu.room
          .on("connectionStateChanged", st => console.log("[CREATOR SFU] room state:", st))
          .on("trackPublished", pub => console.log("[CREATOR SFU] track published:", pub?.kind));
        await sfu.connect(url, token);
        for (const t of tracks) await sfu.room.localParticipant.publishTrack(t);
        console.log("[CREATOR SFU] published:", tracks.map(t => t.kind));

        (window as any).__creatorSFU = sfu;
        setIsBroadcasting?.(true);
        setSfuMsg("LIVE ✓");
        return; // skip legacy P2P
      } catch (e) {
        console.error("[CREATOR SFU] failed", e);
        setIsBroadcasting?.(false);
        setSfuMsg(`error: ${String((e as Error)?.message || e)}`);
      }
    }
  }

  async function stopBroadcast() {
    try {
      dlog("[CREATOR][SFU] stop pressed");
      setSfuMsg("stopping…");
      const sfu = (window as any).__creatorSFU;
      if (sfu) { try { await sfu.disconnect(); } catch {} (window as any).__creatorSFU = undefined; }
      setIsBroadcasting?.(false);
      sfuRef.current = null;
      setSfuMsg("stopped");
    } catch (e) {
      dwarn("[CREATOR][SFU] stop error", e);
      setSfuMsg(`stop error: ${String((e as Error)?.message || e)}`);
    }
  }

  // expose to DevTools just in case (debug only)
  React.useEffect(() => {
    if (RUNTIME.DEBUG_LOGS) {
      (window as any).__creatorStartSFU = confirmJoin;
      (window as any).__creatorStopSFU = stopBroadcast;
    }
    dlog("[CREATOR][SFU] panel mounted");
    return () => {
      if (RUNTIME.DEBUG_LOGS) {
        delete (window as any).__creatorStartSFU;
        delete (window as any).__creatorStopSFU;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Creator camera preview (always rendered) */}
      <div className="w-full max-w-xl aspect-video bg-black/80 rounded-xl overflow-hidden">
        <video id="creatorPreview" className="w-full h-full object-cover" muted playsInline autoPlay />
      </div>
      
      {/* SFU Control Panel */}
      <div className="bg-black/85 text-white p-3 rounded-xl font-mono text-sm">
        <div className="font-bold mb-2">SFU Control</div>
        <div className="text-xs leading-relaxed min-h-9 whitespace-pre-wrap mb-3">
          {__sfuMsg}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={confirmJoin}
            className="flex-1 px-3 py-2 rounded-lg border border-green-400 bg-green-900/40 text-green-400 hover:bg-green-900/60 cursor-pointer"
          >
            Start Broadcast
          </button>
          <button 
            onClick={stopBroadcast}
            className="flex-1 px-3 py-2 rounded-lg border border-red-400 bg-red-900/40 text-red-400 hover:bg-red-900/60 cursor-pointer"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}