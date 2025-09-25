export const LIVEKIT_TOKEN_URL = "https://ytqkunjxhtjsbpdrwsjf.functions.supabase.co/get_livekit_token";

export function getIdentity(defaultId?: string) {
  try {
    return defaultId || crypto.randomUUID();
  } catch {
    return defaultId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}