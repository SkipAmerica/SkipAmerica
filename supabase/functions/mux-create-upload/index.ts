import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID')
  const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET')
  
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    console.error('Mux credentials not configured')
    return new Response(
      JSON.stringify({ error: 'Mux not configured' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('Creating Mux direct upload...')
    
    const resp = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`),
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
        },
      }),
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      console.error('Mux API error:', resp.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create upload', details: errorText }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await resp.json()
    const uploadId = data.data.id
    const uploadUrl = data.data.url
    
    console.log('[mux-create-upload] SUCCESS:', { uploadId, uploadUrl })

    return new Response(
      JSON.stringify({ 
        upload_url: uploadUrl,
        upload_id: uploadId 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating Mux upload:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
