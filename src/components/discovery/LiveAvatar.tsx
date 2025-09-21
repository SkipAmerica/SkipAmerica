import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface LiveAvatarProps {
  src?: string
  alt: string
  fallback: string
  isLive?: boolean
  className?: string
}

export function LiveAvatar({ src, alt, fallback, isLive, className }: LiveAvatarProps) {
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
    </div>
  )
}