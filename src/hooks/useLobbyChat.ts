import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type ChatMsg = {
  id: string;
  text: string;
  userId?: string;
  username?: string;
  ts: number; // epoch ms
};

export function useLobbyChat(creatorId?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!creatorId) return;

    if (chanRef.current) {
      try { supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
    }

    const channelName = `realtime:lobby-chat-${creatorId}`;
    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    // log once to confirm creator page is receiving
    ch.on("broadcast", { event: "message" }, (payload: any) => {
      const body = payload?.payload ?? payload ?? {};
      console.debug("[useLobbyChat] rx", channelName, body);
      const msg: ChatMsg = {
        id: body.id ?? crypto.randomUUID(),
        text: body.text ?? "",
        userId: body.userId,
        username: body.username,
        ts: Date.now(),
      };
      // append; we'll reverse at render time
      setMessages((prev) => [...prev, msg].slice(-200));
    });

    ch.subscribe((status) => {
      console.debug("[useLobbyChat] sub", channelName, status);
    });
    chanRef.current = ch;

    return () => {
      try { if (chanRef.current) supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
    };
  }, [creatorId]);

  return messages;
}
