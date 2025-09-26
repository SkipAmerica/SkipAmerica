import React, { useRef, useState, useEffect } from "react";
import OverlayChat from "@/components/live/OverlayChat";
import { createOverlayConfig } from "@/lib/chatConfigs";
import { useExternalChatInput } from "@/hooks/useExternalChatInput";

type Props = { creatorId: string };

export default function CreatorPreviewWithChat({ creatorId }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [attached, setAttached] = useState(false);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState("");
  
  // Set up external chat input integration
  const chatConfig = createOverlayConfig(creatorId);
  const { sendExternalMessage, sending } = useExternalChatInput(chatConfig);

  useEffect(() => {
    console.log("[CreatorPreview] using creatorId:", creatorId, " (will subscribe to realtime:lobby-chat-" + creatorId + ")");
  }, [creatorId]);

  // Ensure creatorId is stable and valid
  if (!creatorId) {
    console.warn("[CreatorPreviewWithChat] No creatorId available");
    return (
      <div className="relative w-full h-[576px] rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center">
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
        } catch { }
        try { track.detach(videoRef.current); } catch { }
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
    const detachRoomHandlers = () => { };
    if (room) {
      const onState = () => onConnected();
      const onLocalPub = () => onPublished();
      room.on("connectionstatechanged", onState);
      room.on("localtrackpublished", onLocalPub);
      // keep a tiny disposer
      (detachRoomHandlers as any).fn = () => {
        try { room.off("connectionstatechanged", onState); } catch { }
        try { room.off("localtrackpublished", onLocalPub); } catch { }
      };
    }

    return () => {
      window.removeEventListener("sfu:creator:connected", onConnected);
      window.removeEventListener("sfu:creator:published", onPublished);
      try { (detachRoomHandlers as any).fn?.(); } catch { }
      // cleanup fallback stream if still running
      try {
        if (fallbackStream) {
          fallbackStream.getTracks().forEach(t => t.stop());
          fallbackStream = null;
        }
      } catch { }
    };
  }, [attached]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    
    try {
      await sendExternalMessage(t);
      setText(""); // Clear input only after successful send
    } catch (error) {
      console.error('[CreatorPreview] Failed to send message:', error);
      // Keep text in input on error so user can retry
    }
  }

  return (
    <div className="space-y-3 w-full min-w-0">
      {/* ensure overlay can sit above video */}
      <div className="relative w-full h-[576px] bg-black overflow-hidden rounded-xl">
        <video
          id="creator-preview"
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <OverlayChat creatorId={creatorId} />
      </div>

      {/* creator input – visible on dark bg */}
      <form onSubmit={onSend} className="flex gap-2">
        <input
          id="creator-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something to the lobby…"
          className="flex-1 rounded-lg border border-white/10 bg-black/40 text-white placeholder-white/60 px-3 py-2 focus:outline-none"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-lg bg-white/15 px-3 py-2 hover:bg-white/25 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
