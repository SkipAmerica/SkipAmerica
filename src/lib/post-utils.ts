import { supabase } from '@/integrations/supabase/client'

export type MediaUploadResult = {
  provider: 'supabase' | 'mux'
  media_url?: string
  thumbnail_url?: string
  playback_id?: string
  duration_sec?: number
  aspect_ratio?: string
  mux_upload_id?: string
}

export async function ensureSkipNativeAccount(userId: string): Promise<string> {
  // 1) Try read: if it exists, return fast
  const { data: existing } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'skip_native')
    .maybeSingle()

  if (existing?.id) return existing.id

  // 2) Create via SECURE RPC (DB uses auth.uid(); cannot be spoofed)
  const { data: createdId, error: rpcErr } = await supabase.rpc('ensure_skip_native_social_account')
  if (rpcErr) {
    console.error('ensure_skip_native_social_account RPC failed', rpcErr)
    throw rpcErr
  }

  // 3) Return the id directly if function returns it; else fetch once
  if (createdId) return createdId as string

  const { data, error } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'skip_native')
    .single()

  if (error || !data) throw new Error('Social account exists but could not be retrieved')
  return data.id
}

/**
 * Uploads an image to Supabase or a video to Mux via Edge Function.
 * - Images → Supabase Storage (public or signed URLs)
 * - Videos → Call mux-create-upload to get upload URL, then PUT file; returns playback_id
 */
export async function uploadPostMedia(file: File, opts?: { pathPrefix?: string }): Promise<MediaUploadResult> {
  if (!file) throw new Error('No file provided')

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (isImage) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `${opts?.pathPrefix || 'posts'}/${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage.from('posts-media').upload(key, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error

    const { data: pub } = supabase.storage.from('posts-media').getPublicUrl(key)

    return {
      provider: 'supabase',
      media_url: pub.publicUrl,
      thumbnail_url: pub.publicUrl,
      aspect_ratio: 'auto',
    }
  }

  if (isVideo) {
    console.log('[uploadPostMedia] Starting video upload:', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type
    })

    // Ask Edge Function for a direct upload URL to Mux
    const { data: uploadData, error: fnError } = await supabase.functions.invoke('mux-create-upload')
    if (fnError) {
      console.error('[uploadPostMedia] Mux init error:', fnError)
      throw new Error('Failed to init Mux upload')
    }
    
    const { upload_url, upload_id } = uploadData
    console.log('[uploadPostMedia] Mux upload created:', { upload_id, upload_url })

    // Send the file to Mux direct upload URL
    console.log('[uploadPostMedia] Starting PUT to Mux...')
    const put = await fetch(upload_url, { method: 'PUT', body: file })
    
    if (!put.ok) {
      const errorText = await put.text()
      console.error('[uploadPostMedia] Mux PUT failed:', { 
        status: put.status, 
        statusText: put.statusText,
        error: errorText
      })
      throw new Error('Mux upload failed')
    }

    console.log('[uploadPostMedia] ✅ Video uploaded to Mux:', { upload_id })

    // The webhook will finalize asset + playback_id. For now, return a placeholder status.
    // Client will post with media_status='processing'; feed will swap to ready when webhook updates the row.
    return { provider: 'mux', mux_upload_id: upload_id }
  }

  throw new Error('Unsupported file type')
}

export async function createPostRecord(input: {
  social_account_id: string
  content_type: 'text' | 'image' | 'video'
  title?: string | null
  description?: string | null
  media_url?: string | null
  thumbnail_url?: string | null
  provider?: 'supabase' | 'mux'
  playback_id?: string | null
  duration_sec?: number | null
  aspect_ratio?: string | null
  mux_upload_id?: string | null
}): Promise<string> {
  const platform_post_id = `skip_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`

  console.log('[createPostRecord] Creating post:', {
    content_type: input.content_type,
    provider: input.provider,
    mux_upload_id: input.mux_upload_id,
    has_media: !!input.media_url
  })

  const { data, error } = await supabase
    .from('creator_content')
    .insert({
      social_account_id: input.social_account_id,
      platform_post_id,
      content_type: input.content_type,
      title: input.title ?? null,
      description: input.description ?? null,
      media_url: input.media_url ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      provider: input.provider ?? (input.content_type === 'video' ? 'mux' : 'supabase'),
      playback_id: input.playback_id ?? null,
      duration_sec: input.duration_sec ?? null,
      aspect_ratio: input.aspect_ratio ?? null,
      mux_upload_id: input.mux_upload_id ?? null,
      media_status: input.content_type === 'video' ? 'processing' : 'ready',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[createPostRecord] Insert failed:', error)
    throw error || new Error('Failed to insert post')
  }
  
  console.log('[createPostRecord] ✅ Post created:', data.id)
  return data.id
}

export async function toggleLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  // Try to insert; if conflict, delete
  const { data: existing } = await supabase
    .from('content_reactions')
    .select('id')
    .eq('content_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.id) {
    await supabase.from('content_reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('content_reactions').insert({ 
      content_id: postId, 
      user_id: userId, 
      reaction_type: 'like' 
    } as any)
  }

  // Return updated count
  const { data: agg } = await supabase
    .from('creator_content')
    .select('like_count')
    .eq('id', postId)
    .single()

  return { liked: !existing?.id, count: agg?.like_count ?? 0 }
}
