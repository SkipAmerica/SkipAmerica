import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FollowConnectButtonsProps {
  onConnect: () => void
  isOwnPost: boolean
  variant: 'overlay' | 'inline'
  className?: string
}

export function FollowConnectButtons({
  onConnect,
  isOwnPost,
  variant,
  className,
}: FollowConnectButtonsProps) {
  if (isOwnPost) return null

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Connect Button Only - Follow is hidden */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onConnect()
        }}
        className="px-3.5 py-1 rounded text-xs font-medium text-white bg-[#00C2D8] hover:bg-gradient-to-r hover:from-primary hover:to-primary/80 transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
      >
        Connect
      </button>
    </div>
  )
}
