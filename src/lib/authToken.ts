import { supabase } from "@/lib/supabaseClient";

export async function getAuthJWT(): Promise<string> {
  // Make sure we have a session (anon or real)
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously(); // v2 API
    ({ data: { session } } = await supabase.auth.getSession());
  }
  if (!session?.access_token) throw new Error("No Supabase session/token available");
  return session.access_token;
}