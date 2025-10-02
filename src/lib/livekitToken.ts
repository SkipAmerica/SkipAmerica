import { supabase } from "@/integrations/supabase/client";

export type TokenPayload = {
  role: "viewer" | "publisher";
  creatorId: string;
  identity: string;
};

export async function fetchLiveKitToken(payload: TokenPayload) {
  const { data, error } = await supabase.functions.invoke("get_livekit_token", {
    body: payload, // POST with JSON, includes auth automatically
  });
  if (error) throw error;
  if (!data?.token || !data?.url) throw new Error("Bad token response");
  return data as { token: string; url: string; room?: string };
}