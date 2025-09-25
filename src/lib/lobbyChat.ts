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
    console.warn("[lobbyChat] DB insert failed", e);
    throw e;
  }
}