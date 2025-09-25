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

  // 1) Persist to DB (history) — best effort
  try {
    await supabase.from("lobby_chat_messages").insert({
      creator_id: creatorId,
      user_id: userId ?? null,
      message: text,
    });
  } catch (e) {
    console.warn("[lobbyChat] DB insert failed (continuing to broadcast)", e);
  }

  // 2) Broadcast for overlays (instant UI) — reuse the existing singleton channel
  const channelName = `realtime:lobby-chat-${creatorId}`;
  // @ts-ignore
  const reg = (window as any).__lobbyChanRegistry || {};
  let ch = reg[channelName];
  if (!ch) {
    // lazy init if something sent before any listener mounted
    ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });
    // keep it in the registry for future sends/listens
    // @ts-ignore
    (window as any).__lobbyChanRegistry = { ...reg, [channelName]: ch };
    // kick a subscribe so .send can succeed quickly; no-op if it's already connected
    ch.subscribe().catch(() => {});
  }
  try {
    await ch.send({
      type: "broadcast",
      event: "message",
      payload: { id: crypto.randomUUID(), text, userId, username },
    });
  } catch (e) {
    console.warn("[lobbyChat] broadcast failed", e);
  }
}