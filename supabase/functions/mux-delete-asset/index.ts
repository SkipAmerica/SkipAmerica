import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID')
    const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET')

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error('Mux credentials not configured')
    }

    const { playbackId } = await req.json()
    
    if (!playbackId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing playbackId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const auth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)
    
    // Find asset by playback ID
    const assetsRes = await fetch(
      `https://api.mux.com/video/v1/assets?playback_id=${playbackId}`,
      { headers: { Authorization: `Basic ${auth}` } }
    )
    
    if (!assetsRes.ok) {
      throw new Error(`Failed to find Mux asset: ${assetsRes.statusText}`)
    }

    const { data: assets } = await assetsRes.json()
    
    if (assets?.[0]?.id) {
      // Delete asset
      const deleteRes = await fetch(
        `https://api.mux.com/video/v1/assets/${assets[0].id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Basic ${auth}` }
        }
      )

      if (!deleteRes.ok) {
        throw new Error(`Failed to delete Mux asset: ${deleteRes.statusText}`)
      }

      console.log(`Successfully deleted Mux asset: ${assets[0].id}`)
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Mux deletion error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
