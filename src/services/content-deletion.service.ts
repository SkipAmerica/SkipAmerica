import { supabase } from '@/integrations/supabase/client'
import { handleSupabaseError } from '@/shared/api/errors'

export interface DeleteContentOptions {
  reason?: string
  hardDelete?: boolean
}

export interface DeleteContentResult {
  success: boolean
  contentId: string
  mediaFiles: string[]
  provider: 'supabase' | 'mux'
  playbackId?: string | null
  error?: string
}

/**
 * Enterprise-grade content deletion service
 * - Soft delete by default (recoverable)
 * - Handles media cleanup (Storage, Mux)
 * - Audit trail logging
 * - Cascading cleanup via DB triggers
 */
export class ContentDeletionService {
  /**
   * Delete a post with full cleanup
   */
  static async deletePost(
    contentId: string, 
    options: DeleteContentOptions = {}
  ): Promise<DeleteContentResult> {
    try {
      // Call secure DB function
      const { data, error } = await supabase.rpc('delete_creator_content', {
        p_content_id: contentId,
        p_reason: options.reason || null,
        p_hard_delete: options.hardDelete || false,
      })

      if (error) throw handleSupabaseError(error)
      
      const result = data as unknown as DeleteContentResult
      if (!result?.success) {
        return { ...result, success: false }
      }

      // Clean up media files asynchronously
      if (result.mediaFiles?.length > 0) {
        this.cleanupMediaFiles(result.mediaFiles, result.provider, result.playbackId)
          .catch(err => console.error('Media cleanup failed:', err))
      }

      return result
    } catch (error) {
      console.error('Delete post error:', error)
      throw error
    }
  }

  /**
   * Restore a soft-deleted post
   */
  static async restorePost(contentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('creator_content')
      .update({ 
        deleted_at: null, 
        deleted_by: null,
        deletion_reason: null 
      })
      .eq('id', contentId)
      .not('deleted_at', 'is', null)

    if (error) throw handleSupabaseError(error)
    return true
  }

  /**
   * Background media cleanup
   */
  private static async cleanupMediaFiles(
    files: string[],
    provider: 'supabase' | 'mux',
    playbackId?: string | null
  ): Promise<void> {
    if (provider === 'supabase') {
      // Extract paths from URLs
      const paths = files
        .map(url => {
          const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
          return match ? match[1] : null
        })
        .filter(Boolean) as string[]

      if (paths.length > 0) {
        await supabase.storage.from('posts-media').remove(paths)
      }
    } else if (provider === 'mux' && playbackId) {
      // Call Mux deletion edge function
      await supabase.functions.invoke('mux-delete-asset', {
        body: { playbackId }
      })
    }
  }
}
