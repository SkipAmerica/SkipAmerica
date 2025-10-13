// LiveKit token utilities
import { supabase } from "@/integrations/supabase/client";

export async function fetchLiveKitToken(payload: {
  role: "viewer" | "publisher";
  creatorId: string;
  identity: string;
  sessionId?: string; // NEW: optional session ID
  roomName?: string; // NEW: explicit room name for preview room
}) {
  console.log('[sfuToken] 📤 Fetching token with payload:', payload);
  
  const { data, error } = await supabase.functions.invoke("get_livekit_token", {
    body: {
      role: payload.role,
      creatorId: payload.creatorId,
      identity: payload.identity,
      sessionId: payload.sessionId, // Pass session ID if provided
      roomName: payload.roomName, // Pass room name if provided
    },
  });
  
  if (error) {
    console.error('[sfuToken] ❌ Token fetch error:', {
      error,
      status: (error as any).status,
      message: error.message,
      details: (error as any).details
    });
    // Enhanced logging in dev
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Token] Fetch failed:', {
        status: (error as any).status,
        message: error.message,
        details: (error as any).details?.slice(0, 200), // First 200 chars
      })
    }
    
    // Classify 401/403 for better UX
    const status = (error as any).status
    if (status === 401 || status === 403) {
      const e = new Error('Session expired') as any
      e.is401Or403 = true
      throw e
    }
    
    throw error
  }
  
  console.log('[sfuToken] ✅ Token response received:', {
    hasToken: !!data?.token,
    hasUrl: !!data?.url,
    hasRoom: !!data?.room,
    tokenPreview: data?.token?.substring(0, 20) + '...',
    url: data?.url,
    room: data?.room
  });
  
  // data is { token, url, room }
  if (!data?.token || !data?.url) {
    const err = new Error("Bad token response");
    console.error('[sfuToken] ❌ Invalid token response:', data);
    throw err;
  }
  
  return data as { token: string; url: string; room?: string };
}

export function getIdentity(fallback?: string) { 
  return fallback || crypto.randomUUID(); 
}