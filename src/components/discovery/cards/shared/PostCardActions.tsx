import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Repeat2, Share, Video, Calendar } from 'lucide-react'
import { LiveActionButton } from '../../LiveActionButton'
import { cn } from '@/lib/utils'
import { RUNTIME } from '@/config/runtime'

interface PostCardActionsProps {
  postId: string
  creatorId: string
  isLive?: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
  onLike: () => void
  onJoinLive?: () => void
  onBookAppointment?: () => void
  className?: string
  showBorder?: boolean
}

export function PostCardActions({
  postId,
  creatorId,
  isLive,
  likeCount,
  commentCount,
  isLiked,
  onLike,
  onJoinLive,
  onBookAppointment,
  className = '',
  showBorder = true,
}: PostCardActionsProps) {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const handleJoinLive = () => {
    if (RUNTIME.DEBUG_LOGS) {
      console.error('Joining live session for creator:', creatorId)
    }
    onJoinLive?.()
  }

  const handleBookAppointment = () => {
    if (RUNTIME.DEBUG_LOGS) {
      console.error('Booking appointment with creator:', creatorId)
    }
    onBookAppointment?.()
  }

  return (
    <div className={cn(
      'flex items-center justify-between mt-4 pt-3',
      showBorder && 'border-t border-border',
      className
    )}>
      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 md:gap-3 mr-1 md:mr-2">
          {isLive && (
            <LiveActionButton
              icon={Video}
              color="green"
              onPress={handleJoinLive}
            />
          )}
          <LiveActionButton
            icon={Calendar}
            color="blue"
            onPress={handleBookAppointment}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className={cn(
            "gap-1 md:gap-2 px-0 hover:bg-transparent",
            isLiked && "text-red-500"
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
          <span className="text-xs font-medium">{formatCount(likeCount)}</span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-0 hover:bg-transparent">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-medium">{formatCount(commentCount)}</span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-0 hover:bg-transparent">
          <Repeat2 className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent">
          <Share className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
