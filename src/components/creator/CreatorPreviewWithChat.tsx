import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  creatorId: string;
};

type ChatMsg = { id: string; user?: string; text: string; ts: string };

export default function CreatorPreviewWithChat({ creatorId }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [attached, setAttached] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);

  // Attach local camera track from LiveKit when available
  useEffect(() => {
    let interval: any;

    const tryAttach = () => {
      // @ts-ignore
      const sfu = (window as any).__creatorSFU;
      const room = sfu?.room;
      const lp = room?.localParticipant;
      if (!room || !lp) return;

      setConnected(room.state === "connected");

      // find first published video track
      // guard everything to avoid undefined
      const pubs = lp?.videoTracks ? Array.from(lp.videoTracks.values()) : [];
      const activePub = pubs.find((p: any) => p?.track) as any;
      const track = activePub?.track;

      if (track && videoRef.current && !attached) {
        try {
          // ensure preview element exists & is configured
          videoRef.current.autoplay = true;
          videoRef.current.playsInline = true;
          videoRef.current.muted = true; // avoid autoplay restrictions
          // detach any old sinks first
          try { track.detach(videoRef.current); } catch {}
          track.attach(videoRef.current);
          setAttached(true);
        } catch (e) {
          console.warn("[CREATOR PREVIEW] attach failed", e);
        }
      }
    };

    // fast check immediately + poll briefly until attached
    tryAttach();
    interval = setInterval(tryAttach, 800);
    return () => clearInterval(interval);
  }, [attached]);

  // Listen for a custom event (if SFU code dispatches one) to re-try immediately
  useEffect(() => {
    const onEvt = () => setAttached(false);
    window.addEventListener("sfu:creator:connected", onEvt);
    window.addEventListener("sfu:creator:published", onEvt);
    return () => {
      window.removeEventListener("sfu:creator:connected", onEvt);
      window.removeEventListener("sfu:creator:published", onEvt);
    };
  }, []);

  // Subscribe to lobby chat overlay (best-effort)
  useEffect(() => {
    // prefer per-creator lobby channel
    const chName = `realtime:lobby-chat-${creatorId}`;
    const ch = supabase.channel(chName, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "message" }, (payload: any) => {
      const msg: ChatMsg = {
        id: payload?.id ?? crypto.randomUUID(),
        user: payload?.user ?? "anon",
        text: payload?.text ?? "",
        ts: new Date().toISOString(),
      };
      setChat((prev) => [...prev.slice(-99), msg]);
    });

    ch.subscribe();

    return () => {
      try { ch.unsubscribe(); } catch {}
    };
  }, [creatorId]);

  return (
    <div className="relative w-full max-w-3xl">
      {/* Video preview surface */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
            Waiting for LiveKit connection…
          </div>
        )}
      </div>

      {/* Chat overlay */}
      <div className="pointer-events-auto absolute inset-x-4 bottom-4 max-h-52 overflow-y-auto rounded-xl bg-black/40 backdrop-blur p-3 border border-white/10 text-white">
        <div className="text-xs opacity-70 pb-1">Lobby Chat</div>
        <div className="space-y-1 text-sm leading-tight">
          {chat.length === 0 && <div className="opacity-60">No messages yet…</div>}
          {chat.map((m) => (
            <div key={m.id} className="flex gap-2">
              <span className="opacity-70">{m.user ?? "user"}:</span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}