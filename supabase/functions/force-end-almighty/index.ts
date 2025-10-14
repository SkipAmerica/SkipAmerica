import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[force-end-almighty] Starting cleanup...');

    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Fetch all active sessions
    const { data: sessions, error: fetchError } = await supabaseAdmin
      .from('almighty_sessions')
      .select('id, creator_id, fan_id, queue_entry_id, created_at')
      .neq('status', 'ended');

    if (fetchError) {
      console.error('[force-end-almighty] Fetch error:', fetchError);
      throw fetchError;
    }

    console.log(`[force-end-almighty] Found ${sessions?.length || 0} active sessions`);

    let sessionsEnded = 0;

    // 2. End each session
    for (const session of sessions || []) {
      const durationSeconds = Math.floor(
        (Date.now() - new Date(session.created_at).getTime()) / 1000
      );

      // Update session to ended
      const { error: updateError } = await supabaseAdmin
        .from('almighty_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds
        })
        .eq('id', session.id);

      if (updateError) {
        console.error(`[force-end-almighty] Failed to end session ${session.id}:`, updateError);
        continue;
      }

      // Reset queue entry if exists
      if (session.queue_entry_id) {
        await supabaseAdmin
          .from('call_queue')
          .update({ fan_state: 'waiting' })
          .eq('id', session.queue_entry_id);
      }

      // Decline pending invites
      await supabaseAdmin
        .from('session_invites')
        .update({ status: 'declined' })
        .eq('session_id', session.id)
        .eq('status', 'pending');

      sessionsEnded++;
      console.log(`[force-end-almighty] Ended session ${session.id}`);
    }

    // 3. Purge LiveKit rooms
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    let roomsDeleted = 0;

    if (livekitUrl && livekitApiKey && livekitApiSecret) {
      const auth = btoa(`${livekitApiKey}:${livekitApiSecret}`);
      
      // List all rooms
      const listResponse = await fetch(`${livekitUrl}/twirp/livekit.RoomService/ListRooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (listResponse.ok) {
        const { rooms } = await listResponse.json();
        console.log(`[force-end-almighty] Found ${rooms?.length || 0} LiveKit rooms`);

        // Delete session rooms
        for (const room of rooms || []) {
          if (room.name.startsWith('almighty-')) {
            const deleteResponse = await fetch(`${livekitUrl}/twirp/livekit.RoomService/DeleteRoom`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ room: room.name })
            });

            if (deleteResponse.ok) {
              roomsDeleted++;
              console.log(`[force-end-almighty] Deleted LiveKit room: ${room.name}`);
            } else {
              console.error(`[force-end-almighty] Failed to delete room ${room.name}`);
            }
          }
        }
      } else {
        console.error('[force-end-almighty] Failed to list LiveKit rooms:', await listResponse.text());
      }
    } else {
      console.warn('[force-end-almighty] LiveKit credentials not configured, skipping room cleanup');
    }

    const result = {
      success: true,
      sessionsEnded,
      roomsDeleted
    };

    console.log('[force-end-almighty] Cleanup complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[force-end-almighty] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
