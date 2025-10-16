import { useCallback } from 'react'
import { useAsyncAction } from '@/shared/hooks/use-async-action'
import { ContentDeletionService, DeleteContentOptions } from '@/services/content-deletion.service'
import { toast } from 'sonner'

export interface UseContentDeletionOptions {
  onSuccess?: (contentId: string) => void
  onError?: (error: Error) => void
  showToasts?: boolean
}

/**
 * Reusable hook for content deletion
 * Works across Feed, Profile, Search, etc.
 */
export function useContentDeletion(options: UseContentDeletionOptions = {}) {
  const { showToasts = true } = options
  const { loading, error, execute, reset } = useAsyncAction(
    ContentDeletionService.deletePost
  )

  const deleteContent = useCallback(
    async (contentId: string, deleteOptions?: DeleteContentOptions) => {
      try {
        const result = await execute(contentId, deleteOptions)
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete content')
        }

        if (showToasts) {
          toast.success('Post deleted successfully')
        }
        
        options.onSuccess?.(contentId)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Delete failed')
        if (showToasts) {
          toast.error(error.message)
        }
        options.onError?.(error)
        throw error
      }
    },
    [execute, options, showToasts]
  )

  return {
    deleteContent,
    loading,
    error,
    reset,
  }
}
