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

    // Call the database cleanup function for stale entries
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

    // Orphaned in_call cleanup: Remove entries stuck in in_call without active session
    console.log('[QUEUE_CLEANUP] Checking for orphaned in_call entries...')
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    const { data: orphanedEntries, error: orphanError } = await supabase
      .from('call_queue')
      .select('id, creator_id, fan_id, fan_state, created_at')
      .eq('fan_state', 'in_call')
      .lt('created_at', tenMinutesAgo)
    
    if (orphanError) {
      console.error('[QUEUE_CLEANUP] Failed to check orphaned entries:', orphanError)
    } else if (orphanedEntries && orphanedEntries.length > 0) {
      console.warn('[QUEUE_CLEANUP] Found orphaned in_call entries', {
        count: orphanedEntries.length
      })
      
      // Check each entry for active session
      for (const entry of orphanedEntries) {
        const { data: session } = await supabase
          .from('almighty_sessions')
          .select('id, status')
          .eq('creator_id', entry.creator_id)
          .eq('fan_id', entry.fan_id)
          .eq('status', 'active')
          .maybeSingle()
        
        if (!session) {
          // No active session - delete the entry
          await supabase
            .from('call_queue')
            .delete()
            .eq('id', entry.id)
          
          console.log('[QUEUE_CLEANUP] Deleted orphaned entry', { 
            entryId: entry.id,
            fanState: entry.fan_state,
            age: Date.now() - new Date(entry.created_at).getTime()
          })
        }
      }
    } else {
      console.log('[QUEUE_CLEANUP] No orphaned in_call entries found')
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
        message: String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})