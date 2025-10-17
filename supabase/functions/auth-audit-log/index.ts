import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event, user_id, email, session_token, metadata } = await req.json()

    // Log to audit table
    const { error } = await supabase.from('auth_audit_log').insert({
      event_type: event,
      user_id,
      email,
      session_token: session_token?.substring(0, 10) + '...', // Never store full token
      metadata,
      timestamp: new Date().toISOString()
    })

    if (error) {
      console.error('Error logging to audit table:', error)
      throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auth audit log error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
