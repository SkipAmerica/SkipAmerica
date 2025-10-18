import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { useContentDeletion } from '@/hooks/use-content-deletion'
import { toggleLike } from '@/lib/post-utils'
import { toast } from 'sonner'
import { RUNTIME } from '@/config/runtime'

interface UsePostInteractionsProps {
  postId: string
  creatorId: string
  initialLikeCount: number
}

export function usePostInteractions({ postId, creatorId, initialLikeCount }: UsePostInteractionsProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { deleteContent, loading: deleting } = useContentDeletion({
    onSuccess: (contentId) => {
      window.dispatchEvent(
        new CustomEvent('content-deleted', { detail: { contentId } })
      )
    }
  })

  const handleLike = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to like posts')
      return
    }
    
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1)
    
    try {
      const result = await toggleLike(postId, user.id)
      setIsLiked(result.liked)
      setLikeCount(result.count)
    } catch (error) {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
      toast.error('Failed to update like')
      console.error('Like error:', error)
    }
  }, [isLiked, likeCount, postId, user])

  const handleFollowToggle = useCallback(() => {
    setIsFollowing(prev => !prev)
    if (RUNTIME.DEBUG_LOGS) {
      console.log('Follow toggled for creator:', creatorId, !isFollowing)
    }
  }, [creatorId, isFollowing])

  const handleDelete = useCallback(async (reason?: string) => {
    await deleteContent(postId, { reason })
    setShowDeleteDialog(false)
  }, [deleteContent, postId])

  const handleConnect = useCallback(() => {
    if (RUNTIME.DEBUG_LOGS) {
      console.log('[Connect] Creator:', creatorId)
    }
    // TODO: Implement connection flow (DM/appointment/etc)
  }, [creatorId])

  return {
    isLiked,
    likeCount,
    handleLike,
    isFollowing,
    handleFollowToggle,
    handleConnect,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDelete,
    deleting,
  }
}
