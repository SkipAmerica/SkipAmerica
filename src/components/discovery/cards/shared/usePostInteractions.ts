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
  const [showHistory, setShowHistory] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef<number>(0)
  const currentX = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    currentX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    
    const deltaX = currentX.current - startX.current
    const threshold = 100
    
    if (deltaX > threshold) {
      setShowHistory(true)
    } else if (deltaX < -threshold && showHistory) {
      setShowHistory(false)
    }
    
    isDragging.current = false
  }, [showHistory])

  return {
    isLiked,
    likeCount,
    handleLike,
    isFollowing,
    handleFollowToggle,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDelete,
    deleting,
    cardRef,
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    showHistory,
    setShowHistory,
  }
}
