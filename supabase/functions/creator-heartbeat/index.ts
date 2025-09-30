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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { isOnline } = await req.json();
    const now = new Date().toISOString();

    console.log('[Heartbeat] Creator:', user.id, 'isOnline:', isOnline);

    // Update or insert presence record
    const { error: presenceError } = await supabase
      .from('creator_presence')
      .upsert({
        creator_id: user.id,
        is_online: isOnline,
        last_heartbeat: now,
        updated_at: now,
      }, {
        onConflict: 'creator_id'
      });

    if (presenceError) {
      console.error('[Heartbeat] Presence update error:', presenceError);
      throw presenceError;
    }

    // Also update creators table
    const { error: creatorsError } = await supabase
      .from('creators')
      .update({
        is_online: isOnline,
        last_seen_at: now,
      })
      .eq('id', user.id);

    if (creatorsError) {
      console.error('[Heartbeat] Creators update error:', creatorsError);
      // Don't throw - presence is more important
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: now }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});