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

      // Update post with ready state (idempotent, no status filter)
      const { data: updated, error: updateError } = await supabase
        .from('creator_content')
        .update({
          media_status: 'ready',
          provider: 'mux',
          playback_id: playbackId,
          thumbnail_url: poster,
          duration_sec: duration ? Math.round(duration) : null,
          aspect_ratio: aspectRatio,
        })
        .eq('mux_upload_id', uploadId)
        .select('id')

      if (updateError) {
        console.error('[mux-webhook] Error updating post:', updateError)
      } else if (updated && updated.length > 0) {
        console.log('[mux-webhook] ✅ Post updated successfully:', updated[0].id)
      } else {
        console.warn('[mux-webhook] ⚠️ No matching post found for uploadId:', uploadId)
      }
    }
    
    // Handle video.asset.errored - Video processing failed
    else if (type === 'video.asset.errored') {
      const assetId = payload?.data?.id
      const errorData = payload?.data?.errors || { messages: ['Unknown error'] }
      
      console.error('[mux-webhook] Asset errored:', { 
        assetId, 
        uploadId, 
        errors: errorData 
      })

      if (uploadId) {
        const { data: updated, error: updateError } = await supabase
          .from('creator_content')
          .update({
            media_status: 'error',
            metadata: { mux_error: errorData, mux_asset_id: assetId }
          })
          .eq('mux_upload_id', uploadId)
          .select('id')

        if (updateError) {
          console.error('[mux-webhook] Error updating failed post:', updateError)
        } else if (updated && updated.length > 0) {
          console.log('[mux-webhook] ✅ Marked post as error:', updated[0].id)
        } else {
          console.warn('[mux-webhook] ⚠️ No matching post found for uploadId:', uploadId)
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
