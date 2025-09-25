export const LIVEKIT_TOKEN_URL = "/functions/v1/get_livekit_token";

export function getIdentity(fallback?: string) { 
  return fallback || crypto.randomUUID(); 
}