import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

const API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
    
    const { role, creatorId, identity } = await req.json();
    console.log('[LIVEKIT TOKEN] Request:', { role, creatorId, identity });
    
    if (!role || !creatorId || !identity) {
      return new Response(JSON.stringify({ error: "missing role|creatorId|identity" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
    
    const room = `creator:${creatorId}`;
    const at = new AccessToken(API_KEY, API_SECRET, { identity, ttl: 60 * 60 });
    
    if (role === "creator") {
      at.addGrant({
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
    } else if (role === "viewer") {
      at.addGrant({
        roomJoin: true,
        room,
        canPublish: false,
        canSubscribe: true,
        canPublishData: true,
      });
    }
    
    const token = await at.toJwt();
    console.log('[LIVEKIT TOKEN] Generated token for room:', room);
    
    return new Response(JSON.stringify({ token, url: LIVEKIT_URL }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    console.error('[LIVEKIT TOKEN] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
});