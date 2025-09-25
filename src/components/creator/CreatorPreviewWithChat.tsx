import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import OverlayChat from "@/components/live/OverlayChat";
import { sendLobbyMessage } from "@/lib/lobbyChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { creatorId: string }; // make required so we never subscribe to undefined

export default function CreatorPreviewWithChat({ creatorId }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [attached, setAttached] = useState(false);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState("");
  const [focusHack, setFocusHack] = useState(false);

  useEffect(() => {
    console.log("[CreatorPreview] mounted for creatorId:", creatorId);
  }, [creatorId]);

  // Ensure creatorId is stable and valid
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

  // --- LiveKit-driven preview + instant getUserMedia fallback ---
  useEffect(() => {
    let fallbackStream: MediaStream | null = null;

    const attachLocalTrackIfAny = () => {
      // @ts-ignore
      const sfu = (window as any).__creatorSFU;
      const room = sfu?.room;
      const lp = room?.localParticipant;
      if (!room || !lp) return false;

      setConnected(room.state === "connected");

      // find a published local video track
      const pubs = lp.videoTracks ? Array.from(lp.videoTracks.values()) : [];
      const activePub = pubs.find((p: any) => p?.track) as any;
      const track = activePub?.track;

      if (track && videoRef.current) {
        // prefer LiveKit track over fallback stream
        try {
          // stop fallback if active
          if (fallbackStream) {
            fallbackStream.getTracks().forEach(t => t.stop());
            fallbackStream = null;
          }
        } catch {}
        try { track.detach(videoRef.current); } catch {}
        track.attach(videoRef.current);
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        setAttached(true);
        return true;
      }
      return false;
    };

    const startFallbackPreview = async () => {
      if (attached || !videoRef.current) return;
      try {
        fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        videoRef.current.srcObject = fallbackStream;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
      } catch (e) {
        // ignore (user might block camera)
      }
    };

    // 1) Try to attach any existing LK track now
    const hadTrack = attachLocalTrackIfAny();
    // 2) If no LK track yet, start a temporary fallback so the creator sees themselves instantly
    if (!hadTrack) startFallbackPreview();

    // 3) Listen to SFU lifecycle
    const onConnected = () => {
      setTimeout(() => attachLocalTrackIfAny(), 50);
    };
    const onPublished = () => {
      setTimeout(() => attachLocalTrackIfAny(), 50);
    };

    window.addEventListener("sfu:creator:connected", onConnected);
    window.addEventListener("sfu:creator:published", onPublished);

    // 4) Also subscribe directly to room events if available
    // @ts-ignore
    const sfu = (window as any).__creatorSFU;
    const room = sfu?.room;
    const detachRoomHandlers = () => {};
    if (room) {
      const onState = () => onConnected();
      const onLocalPub = () => onPublished();
      room.on("connectionstatechanged", onState);
      room.on("localtrackpublished", onLocalPub);
      // keep a tiny disposer
      (detachRoomHandlers as any).fn = () => {
        try { room.off("connectionstatechanged", onState); } catch {}
        try { room.off("localtrackpublished", onLocalPub); } catch {}
      };
    }

    return () => {
      window.removeEventListener("sfu:creator:connected", onConnected);
      window.removeEventListener("sfu:creator:published", onPublished);
      try { (detachRoomHandlers as any).fn?.(); } catch {}
      // cleanup fallback stream if still running
      try {
        if (fallbackStream) {
          fallbackStream.getTracks().forEach(t => t.stop());
          fallbackStream = null;
        }
      } catch {}
    };
  }, [attached]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    const username = data?.user?.email?.split("@")[0] ?? "creator";
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendLobbyMessage({ creatorId, userId, username, text: t });
  }

  return (
    <div className="space-y-3">
      {/* ensure overlay can sit above video */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {!connected && !attached && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
            Camera preview (click Start SFU for LiveKit)
          </div>
        )}
        
        {/* Overlay is always mounted; high z-index; pointer-events enabled for scroll */}
        <OverlayChat creatorId={creatorId} />
        {/* TEMP DEBUG BADGE */}
        <div className="absolute left-2 top-2 z-[10000] text-xs px-2 py-1 rounded bg-black/70 text-white">
          CreatorId: {creatorId}
        </div>
      </div>

      {/* creator input – visible on dark bg */}
      <form onSubmit={onSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocusHack(true)}
          onBlur={() => setFocusHack(false)}
          placeholder="Say something to the lobby…"
          className="flex-1 rounded-lg border border-white/30 bg-neutral-900 px-3 py-2 text-white placeholder-white/70 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20 text-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}