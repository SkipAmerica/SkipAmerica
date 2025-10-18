import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FollowConnectButtonsProps {
  isFollowing: boolean
  onFollowToggle: () => void
  onConnect: () => void
  isOwnPost: boolean
  variant: 'overlay' | 'inline'
  className?: string
}

export function FollowConnectButtons({
  isFollowing,
  onFollowToggle,
  onConnect,
  isOwnPost,
  variant,
  className,
}: FollowConnectButtonsProps) {
  if (isOwnPost) return null

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Follow Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onFollowToggle()
        }}
        className={cn(
          'px-3.5 py-1 rounded text-xs font-medium border-2 border-white transition-all duration-200 backdrop-blur-sm',
          isFollowing 
            ? 'bg-gray-600/50 text-white hover:bg-gray-600/70' 
            : 'bg-black/30 text-white hover:bg-black/50'
        )}
      >
        {isFollowing ? 'Unfollow' : 'Follow'}
      </button>

      {/* Connect Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onConnect()
        }}
        className="px-3.5 py-1 rounded text-xs font-medium text-white bg-[#00C2D8] hover:bg-gradient-to-r hover:from-[#00C2D8] hover:to-[#008AA4] transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
      >
        Connect
      </button>
    </div>
  )
}
