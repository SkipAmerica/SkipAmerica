import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const payload = await req.json()
    console.log('Mux webhook received:', payload.type)

    const type = payload?.type

    if (type === 'video.asset.ready') {
      const playbackId = payload?.data?.playback_ids?.[0]?.id
      const assetId = payload?.data?.id
      const duration = payload?.data?.duration || null
      const aspectRatio = payload?.data?.aspect_ratio || null
      const poster = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null

      console.log('Asset ready:', { assetId, playbackId, duration, aspectRatio })

      // Find the most recent processing post with null playback_id
      // In production, you'd store the upload_id in the post record to match precisely
      const { data: posts, error: selectError } = await supabase
        .from('creator_content')
        .select('id')
        .eq('media_status', 'processing')
        .is('playback_id', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (selectError) {
        console.error('Error finding post:', selectError)
        return new Response('ok', { headers: corsHeaders })
      }

      const targetPost = posts?.[0]
      if (targetPost && playbackId) {
        console.log('Updating post:', targetPost.id)

        const { error: updateError } = await supabase
          .from('creator_content')
          .update({
            playback_id: playbackId,
            thumbnail_url: poster,
            provider: 'mux',
            media_status: 'ready',
            duration_sec: duration ? Math.round(duration) : null,
            aspect_ratio: aspectRatio || null,
          })
          .eq('id', targetPost.id)

        if (updateError) {
          console.error('Error updating post:', updateError)
        } else {
          console.log('Post updated successfully')
        }
      } else {
        console.warn('No matching post found for asset:', assetId)
      }
    }

    return new Response('ok', { headers: corsHeaders })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('ok', { headers: corsHeaders })
  }
})
