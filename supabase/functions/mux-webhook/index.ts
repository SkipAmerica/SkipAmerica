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
    console.log('[mux-webhook] Event received:', {
      type: payload.type,
      assetId: payload?.data?.id,
      uploadId: payload?.data?.upload_id,
      timestamp: new Date().toISOString()
    })

    const type = payload?.type

    if (type === 'video.asset.ready') {
      const playbackId = payload?.data?.playback_ids?.[0]?.id
      const assetId = payload?.data?.id
      const uploadId = payload?.data?.upload_id
      const duration = payload?.data?.duration || null
      const aspectRatio = payload?.data?.aspect_ratio || null
      const poster = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null

      console.log('[mux-webhook] Asset ready:', { 
        assetId, 
        uploadId, 
        playbackId, 
        duration, 
        aspectRatio 
      })

      // Match by mux_upload_id for precise identification
      const { data: posts, error: selectError } = await supabase
        .from('creator_content')
        .select('id, mux_upload_id')
        .eq('mux_upload_id', uploadId)
        .eq('media_status', 'processing')
        .limit(1)

      if (selectError) {
        console.error('[mux-webhook] Error finding post:', selectError)
        return new Response('ok', { headers: corsHeaders })
      }

      const targetPost = posts?.[0]
      if (targetPost && playbackId) {
        console.log('[mux-webhook] Updating post:', {
          postId: targetPost.id,
          uploadId: targetPost.mux_upload_id
        })

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
          console.error('[mux-webhook] Error updating post:', updateError)
        } else {
          console.log('[mux-webhook] ✅ Post updated successfully:', targetPost.id)
        }
      } else {
        console.warn('[mux-webhook] ⚠️ No matching post found for:', { 
          assetId, 
          uploadId,
          reason: !targetPost ? 'no post found' : 'no playback_id'
        })
      }
    } else {
      console.log('[mux-webhook] Ignoring event type:', type)
    }

    return new Response('ok', { headers: corsHeaders })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('ok', { headers: corsHeaders })
  }
})
