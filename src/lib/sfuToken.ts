// LiveKit token utilities
import { supabase } from "@/integrations/supabase/client";

export async function fetchLiveKitToken(payload: {
  role: "viewer" | "publisher";
  creatorId: string;
  identity: string;
  sessionId?: string; // NEW: optional session ID
  roomName?: string; // NEW: explicit room name for preview room
}) {
  const requestId = crypto.randomUUID().substring(0, 8)
  
  console.log('[LiveKit:TOKEN_REQUEST]', {
    requestId,
    role: payload.role,
    creatorId: payload.creatorId,
    identity: payload.identity,
    sessionId: payload.sessionId,
    roomName: payload.roomName,
    timestamp: new Date().toISOString()
  });
  
  const { data, error } = await supabase.functions.invoke("get_livekit_token", {
    body: {
      role: payload.role,
      creatorId: payload.creatorId,
      identity: payload.identity,
      sessionId: payload.sessionId,
      roomName: payload.roomName,
      requestId, // Pass requestId for correlation
    },
  });
  
  if (error) {
    console.error('[LiveKit:TOKEN_ERROR]', {
      requestId,
      error,
      status: (error as any).status,
      message: error.message,
      details: (error as any).details,
      timestamp: new Date().toISOString()
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Token] Fetch failed:', {
        requestId,
        status: (error as any).status,
        message: error.message,
        details: (error as any).details?.slice(0, 200),
      })
    }
    
    const status = (error as any).status
    if (status === 401 || status === 403) {
      const e = new Error('Session expired') as any
      e.is401Or403 = true
      throw e
    }
    
    throw error
  }
  
  console.log('[LiveKit:TOKEN_RESPONSE]', {
    requestId,
    hasToken: !!data?.token,
    hasUrl: !!data?.url,
    hasRoom: !!data?.room,
    tokenPreview: data?.token?.substring(0, 20) + '...',
    url: data?.url,
    room: data?.room,
    timestamp: new Date().toISOString()
  });
  
  if (!data?.token || !data?.url) {
    const err = new Error("Bad token response");
    console.error('[LiveKit:TOKEN_INVALID]', { requestId, data });
    throw err;
  }
  
  return data as { token: string; url: string; room?: string };
}

export function getIdentity(fallback?: string) { 
  return fallback || crypto.randomUUID(); 
}