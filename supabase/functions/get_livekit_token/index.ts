import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL")!;
const API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;

const safe = (s: string) =>
  (s || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 120);

serve(async (req) => {
  try {
    const { role, creatorId, identity } = await req.json();
    if (!creatorId) return new Response(JSON.stringify({ error: "creatorId required" }), { status: 400 });

    // single canonical room per creator; no colons
    const room = `lobby_${safe(creatorId)}`;
    const pid  = safe(identity || crypto.randomUUID());

    const at = new AccessToken(API_KEY, API_SECRET, { identity: pid });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: role === "creator",
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return new Response(JSON.stringify({ token, url: LIVEKIT_URL, room }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || "bad request" }), {
      headers: { "content-type": "application/json" },
      status: 400,
    });
  }
});