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

export function useLobbyChat(creatorId?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!creatorId) return;

    // Load historical messages first
    const loadHistoricalMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("lobby_chat_messages")
          .select(`
            id,
            message,
            created_at,
            user_id,
            profiles(full_name, avatar_url)
          `)
          .eq("creator_id", creatorId)
          .order("created_at", { ascending: true })
          .limit(500); // Load last 500 messages

        if (error) {
          console.warn("[useLobbyChat] Failed to load historical messages:", error);
        } else if (data) {
          const historicalMsgs: ChatMsg[] = data.map((row: any) => ({
            id: row.id,
            text: row.message,
            userId: row.user_id,
            username: row.profiles?.full_name?.split(' ')[0] || 'User',
            avatarUrl: row.profiles?.avatar_url,
            ts: new Date(row.created_at).getTime(),
          }));
          setMessages(historicalMsgs);
        }
      } catch (e) {
        console.warn("[useLobbyChat] Error loading historical messages:", e);
      } finally {
        setLoading(false);
      }
    };

    loadHistoricalMessages();

    // Clean up existing channel
    if (chanRef.current) {
      try { supabase.removeChannel(chanRef.current); } catch {}
      chanRef.current = null;
    }

    // Set up real-time subscription
    const channelName = `realtime:lobby-chat-${creatorId}`;
    const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    ch.on("broadcast", { event: "message" }, (payload: any) => {
      const body = payload?.payload ?? payload ?? {};
      console.debug("[useLobbyChat] rx", channelName, body);
      const msg: ChatMsg = {
        id: body.id ?? crypto.randomUUID(),
        text: body.text ?? "",
        userId: body.userId,
        username: body.username,
        avatarUrl: body.avatarUrl,
        ts: Date.now(),
      };
      // Append new message to existing history
      setMessages((prev) => [...prev, msg]);
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

  return { messages, loading };
}
