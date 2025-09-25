import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type ChatMsg = {
  id: string;
  text: string;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  ts: number; // epoch ms
};

// global singleton registry so components share the same realtime channel
const _lobbyChanRegistry: Record<string, ReturnType<typeof supabase.channel> | undefined> =
  (window as any).__lobbyChanRegistry || ((window as any).__lobbyChanRegistry = {});

export function useLobbyChat(creatorId?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<"connecting"|"joined"|"reconnecting"|"closed">("connecting");
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!creatorId) return;

    // 1) Reuse a single channel per creatorId (do NOT create/destroy on each mount)
    const channelName = `realtime:lobby-chat-${creatorId}`;
    let ch = _lobbyChanRegistry[channelName];
    if (!ch) {
      ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
      _lobbyChanRegistry[channelName] = ch;
    }
    chanRef.current = ch;

    // 2) Idempotent handler registration
    // Guard so we don't attach listeners more than once
    // @ts-ignore
    if (!(ch as any).__handlersBound) {
      // message handler
      ch.on("broadcast", { event: "message" }, (payload: any) => {
        const body = payload?.payload ?? payload ?? {};
        const msg: ChatMsg = {
          id: body.id ?? crypto.randomUUID(),
          text: body.text ?? "",
          userId: body.userId,
          username: body.username,
          avatarUrl: body.avatarUrl,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, msg].slice(-200)); // keep more; viewer/creator share
      });

      // status handler
      ch.subscribe((s) => {
        if (import.meta.env.DEV) console.debug("[useLobbyChat] status", channelName, s);
        if (s === "SUBSCRIBED") setStatus("joined");
        else if (s === "CLOSED") setStatus("reconnecting"); // treat as transient
      });

      // mark bound
      // @ts-ignore
      (ch as any).__handlersBound = true;
    }

    // 3) Soft cleanup: DO NOT remove the channel (let others reuse it).
    // Only clear our local ref on unmount.
    return () => { chanRef.current = null; };
  }, [creatorId]);

  // expose status if caller wants to show "reconnecting..."
  // (Overlay uses messages only; creator page can read status if needed)
  return messages;
}
