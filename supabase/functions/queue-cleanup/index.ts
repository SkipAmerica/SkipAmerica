import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[QUEUE_CLEANUP] Starting queue cleanup process...')

    // Call the database cleanup function
    const { error: cleanupError } = await supabase.rpc('cleanup_stale_queue_entries')
    
    if (cleanupError) {
      console.error('[QUEUE_CLEANUP] Database cleanup failed:', cleanupError)
      return new Response(
        JSON.stringify({ 
          error: 'Cleanup failed',
          details: cleanupError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get remaining queue count for monitoring
    const { count, error: countError } = await supabase
      .from('call_queue')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.warn('[QUEUE_CLEANUP] Could not get remaining count:', countError)
    }

    console.log(`[QUEUE_CLEANUP] Cleanup completed. Remaining queue entries: ${count || 'unknown'}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Queue cleanup completed',
        remainingEntries: count || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[QUEUE_CLEANUP] Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})