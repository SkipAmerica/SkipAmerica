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

    // Always use the exact same channel name format as PQ
    const channelName = `realtime:lobby-chat-${creatorId}`;
    console.log("[useLobbyChat] subscribe ->", channelName);

    // Clean any prior channel before re-subscribing
    try {
      if (chanRef.current) {
        console.log("[useLobbyChat] removing previous channel");
        supabase.removeChannel(chanRef.current);
        chanRef.current = null;
      }
    } catch {}

    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "message" }, (payload: any) => {
      const body = (payload?.payload ?? payload ?? {}) as Partial<ChatMsg>;
      const msg: ChatMsg = {
        id: body.id ?? crypto.randomUUID(),
        text: body.text ?? "",
        userId: body.userId,
        username: body.username,
        ts: Date.now(),
      };
      // Newest goes first visually; we'll render in reversed order.
      setMessages((prev) => [...prev, msg].slice(-200));
    });

    ch.subscribe((status) => {
      console.log("[useLobbyChat] status:", status, channelName);
    });

    chanRef.current = ch;

    return () => {
      try {
        console.log("[useLobbyChat] unsubscribe <-", channelName);
        supabase.removeChannel(ch);
      } catch {}
      chanRef.current = null;
    };
  }, [creatorId]);

  return messages;
}