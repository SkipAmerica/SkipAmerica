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
    // Verify Mux webhook signature (optional but recommended)
    const signature = req.headers.get('mux-signature')
    const webhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET')
    
    if (webhookSecret && signature) {
      // TODO: Implement proper signature verification using crypto
      // For now, we log it for debugging
      console.log('[mux-webhook] Signature received:', signature ? 'present' : 'missing')
    }

    const payload = await req.json()
    console.log('[mux-webhook] Event received:', {
      type: payload.type,
      assetId: payload?.data?.id,
      uploadId: payload?.data?.upload_id,
      timestamp: new Date().toISOString()
    })

    const type = payload?.type
    const uploadId = payload?.data?.upload_id

    // Handle video.asset.ready - Video successfully processed
    if (type === 'video.asset.ready') {
      const playbackId = payload?.data?.playback_ids?.[0]?.id
      const assetId = payload?.data?.id
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

      if (!uploadId || !playbackId) {
        console.warn('[mux-webhook] Missing uploadId or playbackId')
        return new Response('ok', { headers: corsHeaders })
      }

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
      if (targetPost) {
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
        console.warn('[mux-webhook] ⚠️ No matching post found for uploadId:', uploadId)
      }
    } 
    
    // Handle video.asset.errored - Video processing failed
    else if (type === 'video.asset.errored') {
      const assetId = payload?.data?.id
      const errorMessage = payload?.data?.errors?.messages?.[0] || 'Unknown error'
      
      console.error('[mux-webhook] Asset errored:', { 
        assetId, 
        uploadId, 
        error: errorMessage 
      })

      if (uploadId) {
        const { error: updateError } = await supabase
          .from('creator_content')
          .update({
            media_status: 'error',
            metadata: { error: errorMessage }
          })
          .eq('mux_upload_id', uploadId)
          .eq('media_status', 'processing')

        if (updateError) {
          console.error('[mux-webhook] Error updating failed post:', updateError)
        } else {
          console.log('[mux-webhook] ✅ Marked post as error:', uploadId)
        }
      }
    }
    
    // Handle video.upload.created - Upload URL created (optional tracking)
    else if (type === 'video.upload.created') {
      console.log('[mux-webhook] Upload created:', { uploadId })
    }
    
    // Handle video.asset.created - Asset started processing (optional tracking)
    else if (type === 'video.asset.created') {
      console.log('[mux-webhook] Asset created:', { assetId: payload?.data?.id, uploadId })
    }
    
    else {
      console.log('[mux-webhook] Ignoring event type:', type)
    }

    return new Response('ok', { headers: corsHeaders })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('ok', { headers: corsHeaders })
  }
})
