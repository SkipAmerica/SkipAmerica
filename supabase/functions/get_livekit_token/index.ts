import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

const API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
const HOST = Deno.env.get("VITE_LIVEKIT_URL")!; // echo for clients

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    
    const { role, creatorId, identity } = await req.json();
    console.log('[LIVEKIT TOKEN] Request:', { role, creatorId, identity });
    
    if (!role || !creatorId || !identity) {
      return json({ error: "missing role|creatorId|identity" }, 400);
    }
    
    const room = `creator:${creatorId}`;
    const at = new AccessToken(API_KEY, API_SECRET, { identity, ttl: 60 * 60 });
    
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: role === "creator",
      canSubscribe: true,
      canPublishData: true,
    });
    
    const token = await at.toJwt();
    console.log('[LIVEKIT TOKEN] Generated token for room:', room);
    
    return json({ token, host: HOST, room });
  } catch (e) {
    console.error('[LIVEKIT TOKEN] Error:', e);
    return json({ error: String(e) }, 500);
  }
});