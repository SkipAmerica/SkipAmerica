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

    const { role, creatorId, identity, sessionId, roomName } = await req.json();
    console.log("[LiveKit Token] Request:", { role, creatorId, identity, sessionId, roomName });

    let room: string;
    let pid: string;

    // Session-based room (Almighty V2)
    if (sessionId) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // AUTH FIRST (required even for dev sessions)
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authorization required" }), { 
          status: 401,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        console.error("[LiveKit Token] Auth failed:", userError);
        return new Response(JSON.stringify({ error: "Invalid authentication" }), { 
          status: 401,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }

      // NOW validate session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('almighty_sessions')
        .select('creator_id, fan_id, status, is_dev')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error("[LiveKit Token] Invalid session:", sessionId, sessionError);
        return new Response(JSON.stringify({ error: "Invalid session" }), { 
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }

      if (session.status === 'ended') {
        console.error("[LiveKit Token] Session already ended:", sessionId);
        return new Response(JSON.stringify({ error: "Session has ended" }), { 
          status: 410,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }

      // DEV SESSION BYPASS (skip participant verification)
      if (session.is_dev) {
        console.log("[LiveKit Token] ✅ Dev session bypass for:", sessionId, "user:", user.id);
        
        room = `session_${safe(sessionId)}`;
        pid = safe(identity || user.id);

        const at = new AccessToken(API_KEY, API_SECRET, { 
          identity: pid,
          metadata: JSON.stringify({
            sessionId,
            role: 'creator',
            userId: user.id,
            mode: 'dev'
          })
        });

        at.addGrant({
          room,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
        });

        const jwtToken = await at.toJwt();

        return new Response(JSON.stringify({ 
          token: jwtToken, 
          url: LIVEKIT_URL, 
          room 
        }), {
          headers: { "content-type": "application/json", ...corsHeaders },
          status: 200,
        });
      }

      // PRODUCTION: Verify user is participant
      if (user.id !== session.creator_id && user.id !== session.fan_id) {
        console.error("[LiveKit Token] Unauthorized user for session:", user.id);
        return new Response(JSON.stringify({ error: "Not authorized for this session" }), { 
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }

      // Session-specific room
      room = `session_${safe(sessionId)}`;
      pid = safe(identity || user.id);

      console.log("[LiveKit Token] Session room:", room, "for user:", user.id);

      // Create token with metadata
      const at = new AccessToken(API_KEY, API_SECRET, { 
        identity: pid,
        metadata: JSON.stringify({
          sessionId,
          role: user.id === session.creator_id ? 'creator' : 'user',
          userId: user.id
        })
      });

      at.addGrant({
        room,
        roomJoin: true,
        canPublish: user.id === session.creator_id || role === "publisher",
        canSubscribe: true,
      });

      const jwtToken = await at.toJwt();

      console.log("[LiveKit Token] Token created successfully");

      return new Response(JSON.stringify({ 
        token: jwtToken, 
        url: LIVEKIT_URL, 
        room 
      }), {
        headers: { "content-type": "application/json", ...corsHeaders },
        status: 200,
      });
    }

    // Legacy lobby room (with security gating)

    if (!creatorId) {
      return new Response(JSON.stringify({ error: "creatorId required" }), { 
        status: 400,
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }

    // Determine room (default to lobby if not provided)
    room = roomName || `lobby_${safe(creatorId)}`;

    // ROUTE A: Publisher role routing
    if (role === 'publisher') {
      // Sub-route A1: Creator broadcasting to lobby
      if (identity === creatorId) {
        // Creator publishes to lobby room (NOT preview)
        room = `lobby_${safe(creatorId)}`;
        console.log("[LiveKit Token] Creator publisher token for lobby:", room);
        // No queue validation needed - creator owns the lobby
        // Skip to token generation below
      } 
      // Sub-route A2: Fan publishing to preview room (queue validation below enforces position 1)
      else {
        console.log("[LiveKit Token] Fan publisher token for room:", room);
        // Continue to existing fan queue validation below
      }
    }

    // BLOCK non-creator viewer access to preview room
    if (role === 'viewer' && room?.startsWith('fanviewer_')) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error("[LiveKit Token] Preview room viewer requires auth");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        console.error("[LiveKit Token] Auth failed for preview room viewer:", authError);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
      
      if (user.id !== creatorId) {
        console.error("[LiveKit Token] Non-creator attempted preview room access:", {
          userId: user.id,
          creatorId,
          roomName: room
        });
        return new Response(JSON.stringify({ 
          error: "Forbidden: preview is creator-only",
          details: "Only the creator can view the preview room"
        }), {
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
    }

    // Security: If requesting publisher role, verify queue position
    if (role === 'publisher') {
      console.log("[LiveKit Token] Validating lobby publisher request");
      
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      // Extract fan ID from identity (should be raw UUID)
      const fanId = identity;
      
      if (!fanId) {
        return new Response(JSON.stringify({ error: "Fan ID required for publisher token" }), {
          status: 400,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
      
      // Query call_queue to verify this fan is authorized
      const { data: queueEntry, error: queueError } = await supabaseAdmin
        .from('call_queue')
        .select('id, fan_state, status, created_at')
        .eq('creator_id', creatorId)
        .eq('fan_id', fanId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (queueError || !queueEntry) {
        console.log("[LiveKit Token] Fan not in queue:", fanId);
        return new Response(JSON.stringify({ 
          error: "Not authorized to publish lobby video",
          details: "You must be in the queue to publish"
        }), {
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
      
      // Verify fan is in 'ready' state (has consented)
      if (queueEntry.fan_state !== 'ready') {
        console.log("[LiveKit Token] Fan not ready:", queueEntry.fan_state);
        return new Response(JSON.stringify({ 
          error: "Not authorized to publish lobby video",
          details: "You must consent before publishing"
        }), {
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
      
      // Check if this fan is actually #1 in the queue
      const { count } = await supabaseAdmin
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'waiting')
        .lt('created_at', queueEntry.created_at);
      
      if (count && count > 0) {
        console.log("[LiveKit Token] Fan is not #1 in queue (position:", count + 1, ")");
        return new Response(JSON.stringify({ 
          error: "Not authorized to publish lobby video",
          details: "Only the next subscriber can publish"
        }), {
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders }
        });
      }
      
      console.log("[LiveKit Token] ✅ Fan authorized to publish:", fanId);
    }

    // Room already determined above; use identity
    pid = safe(identity || crypto.randomUUID());

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