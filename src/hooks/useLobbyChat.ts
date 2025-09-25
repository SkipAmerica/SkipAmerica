import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type ChatMsg = {
  id: string;
  text: string;
  userId?: string;
  username?: string;
  ts: number; // ms
};

export function useLobbyChat(creatorId: string | undefined) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!creatorId) return;

    // idempotent re-subscribe if creator changes
    if (chanRef.current) {
      try { supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
    }

    const channelName = `realtime:lobby-chat-${creatorId}`;
    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "message" }, (payload) => {
      const body = (payload as any)?.payload ?? {};
      const msg: ChatMsg = {
        id: body.id ?? crypto.randomUUID(),
        text: body.text ?? "",
        userId: body.userId,
        username: body.username,
        ts: Date.now(),
      };
      // keep last 50
      setMessages((prev) => [...prev, msg].slice(-50));
    });

    ch.subscribe((status) => {
      if (import.meta.env.DEV) console.log("[OverlayChat] sub status", status, channelName);
    });

    chanRef.current = ch;
    return () => {
      try { if (chanRef.current) supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
    };
  }, [creatorId]);

  return messages;
}
