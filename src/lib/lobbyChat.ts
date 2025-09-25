import { supabase } from "@/lib/supabaseClient";

export async function sendLobbyMessage({
  creatorId,
  userId,
  username,
  text,
}: {
  creatorId: string;
  userId?: string;
  username?: string;
  text: string;
}) {
  if (!creatorId || !text?.trim()) return;

  try {
    await supabase.from("lobby_chat_messages").insert({
      creator_id: creatorId,
      user_id: userId ?? null,
      message: text,
    });
  } catch (e) {
    console.warn("[lobbyChat] DB insert failed (continuing to broadcast)", e);
  }

  const channelName = `realtime:lobby-chat-${creatorId}`;
  const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
  try {
    await ch.subscribe();
    await ch.send({
      type: "broadcast",
      event: "message",
      payload: { id: crypto.randomUUID(), text, userId, username },
    });
  } catch (e) {
    console.warn("[lobbyChat] broadcast failed", e);
  } finally {
    try { await ch.unsubscribe(); } catch {}
  }
}