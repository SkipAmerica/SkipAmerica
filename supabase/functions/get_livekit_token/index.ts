import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");
const API_KEY = Deno.env.get("LIVEKIT_API_KEY");
const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log("[LiveKit Token] Initializing with URL:", LIVEKIT_URL ? "✓ Set" : "✗ Missing");
console.log("[LiveKit Token] API Key:", API_KEY ? "✓ Set" : "✗ Missing");
console.log("[LiveKit Token] API Secret:", API_SECRET ? "✓ Set" : "✗ Missing");

const safe = (s: string) =>
  (s || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 120);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      console.error("[LiveKit Token] Missing required environment variables");
      return new Response(JSON.stringify({ 
        error: "LiveKit configuration incomplete. Contact support.",
        details: {
          hasUrl: !!LIVEKIT_URL,
          hasKey: !!API_KEY,
          hasSecret: !!API_SECRET
        }
      }), { 
        status: 500,
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }

    const { role, creatorId, identity } = await req.json();
    console.log("[LiveKit Token] Request:", { role, creatorId, identity });

    if (!creatorId) {
      return new Response(JSON.stringify({ error: "creatorId required" }), { 
        status: 400,
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }

    // single canonical room per creator; no colons
    const room = `lobby_${safe(creatorId)}`;
    const pid = safe(identity || crypto.randomUUID());

    console.log("[LiveKit Token] Creating token for room:", room, "identity:", pid);

    const at = new AccessToken(API_KEY, API_SECRET, { identity: pid });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: role === "publisher",
      canSubscribe: true,
    });

    const token = await at.toJwt();
    
    console.log("[LiveKit Token] Token created successfully");
    console.log("[LiveKit Token] Returning URL:", LIVEKIT_URL);

    return new Response(JSON.stringify({ 
      token, 
      url: LIVEKIT_URL, 
      room 
    }), {
      headers: { "content-type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    const errorMessage = String((e as Error)?.message ?? e);
    console.error("[LiveKit Token] Error:", errorMessage);
    console.error("[LiveKit Token] Stack:", (e as Error)?.stack);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Token generation failed. Check server logs."
    }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }
});