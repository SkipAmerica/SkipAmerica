// LiveKit token utilities
import { supabase } from "@/lib/supabaseClient";

export async function fetchLiveKitToken(payload: {
  role: "viewer" | "creator" | "publisher";
  creatorId: string;
  identity: string;
}) {
  const { data, error } = await supabase.functions.invoke("get_livekit_token", {
    body: payload,
  });
  if (error) throw error;
  // data is { token, url, room }
  if (!data?.token || !data?.url) throw new Error("Bad token response");
  return data as { token: string; url: string; room?: string };
}

export function getIdentity(fallback?: string) { 
  return fallback || crypto.randomUUID(); 
}