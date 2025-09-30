import { supabase } from "@/lib/supabase";

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
  if (!creatorId || !text?.trim()) {
    console.warn("[lobbyChat] Invalid input:", { creatorId, text, userId });
    return;
  }

  console.log("[lobbyChat] Sending message:", {
    creatorId,
    userId,
    username,
    message: text.substring(0, 50)
  });

  try {
    const { data, error } = await supabase.from("lobby_chat_messages").insert({
      creator_id: creatorId,
      user_id: userId ?? null,
      message: text,
    });

    if (error) {
      console.error("[lobbyChat] Insert failed:", error);
      throw error;
    }

    console.log("[lobbyChat] Message sent successfully:", data);
  } catch (e) {
    console.error("[lobbyChat] Exception:", e);
    throw e;
  }
}