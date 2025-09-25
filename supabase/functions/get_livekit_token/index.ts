import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL")!;
const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;

// strict patterns LiveKit expects (letters, digits, underscore, hyphen)
const ALLOWED = /^[a-z0-9_-]{1,96}$/;

function sanitizeBase(s: string): string {
  // normalize: lowercase, replace illegal with '-', collapse dashes, trim
  const cleaned = s
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96)
    .replace(/^-+|-+$/g, "");
  return cleaned;
}

function sanitizeRoom(creatorId: string): string {
  const base = `creator-${creatorId}`;
  const room = sanitizeBase(base);
  return ALLOWED.test(room) ? room : `creator-${crypto.randomUUID().slice(0,8)}`;
}

function sanitizeIdentity(identity?: string): string {
  const base = identity && identity.trim().length > 0 ? identity : `viewer-${crypto.randomUUID()}`;
  const id = sanitizeBase(base);
  return ALLOWED.test(id) ? id : `viewer-${crypto.randomUUID().slice(0,8)}`;
}

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
      return new Response(JSON.stringify({ error: "POST required" }), { 
        status: 405, 
        headers: { "content-type": "application/json", ...cors } 
      });
    }

    const { role, creatorId, identity } = await req.json().catch(() => ({}));

    if (!role || (role !== "viewer" && role !== "creator")) {
      return new Response(JSON.stringify({ error: "role must be 'viewer' or 'creator'" }), { 
        status: 400, 
        headers: { "content-type": "application/json", ...cors } 
      });
    }
    if (!creatorId || typeof creatorId !== "string") {
      return new Response(JSON.stringify({ error: "creatorId required" }), { 
        status: 400, 
        headers: { "content-type": "application/json", ...cors } 
      });
    }

    const room = sanitizeRoom(creatorId);
    const pid = sanitizeIdentity(identity);

    // debug (safe): shows what we actually used
    console.log("[TOKEN] in:", { role, creatorId, identity });
    console.log("[TOKEN] out:", { room, pid, url: LIVEKIT_URL });

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: pid, ttl: 60 * 60 });
    
    const isCreator = role === "creator";

    const grants = {
      room: `creator:${creatorId}`,
      roomJoin: true,
      canPublish: isCreator,        // creator can publish
      canSubscribe: true,           // both can subscribe
      canPublishData: true,
    };
    
    at.addGrant(grants);

    const token = await at.toJwt();
    console.log('[LIVEKIT TOKEN] Generated token for room:', room);
    
    return new Response(JSON.stringify({ token, url: LIVEKIT_URL, grants }), {
      headers: { "content-type": "application/json", ...cors },
    });
  } catch (e) {
    console.error("[TOKEN] error", e);
    return new Response(JSON.stringify({ error: "internal-error" }), { 
      status: 500, 
      headers: { "content-type": "application/json", ...cors } 
    });
  }
});