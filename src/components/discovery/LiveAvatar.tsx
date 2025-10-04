import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Plus, Minus } from 'lucide-react'

interface LiveAvatarProps {
  src?: string
  alt: string
  fallback: string
  isLive?: boolean
  className?: string
  isFollowing?: boolean
  onFollowToggle?: () => void
}

export function LiveAvatar({ src, alt, fallback, isLive, className, isFollowing = false, onFollowToggle }: LiveAvatarProps) {
  return (
    <div className="relative">
      <Avatar className={cn("h-10 w-10", className)}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {isLive && (
        <>
          <div className="absolute -inset-0.5 rounded-full border-2 border-green-500" />
          <div className="absolute -inset-0.5 rounded-full border-2 border-green-500 animate-ping" />
        </>
      )}
      {onFollowToggle && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFollowToggle()
          }}
          className={cn(
            "absolute -bottom-[10px] -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white transition-colors",
            isFollowing ? "bg-red-500 hover:bg-red-600" : "bg-cyan-500 hover:bg-cyan-600"
          )}
          aria-label={isFollowing ? "Unfollow" : "Follow"}
        >
          {isFollowing ? (
            <Minus className="h-3 w-3 text-white" strokeWidth={3} />
          ) : (
            <Plus className="h-3 w-3 text-white" strokeWidth={3} />
          )}
        </button>
      )}
    </div>
  )
}