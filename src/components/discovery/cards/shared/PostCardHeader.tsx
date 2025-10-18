import { Button } from '@/components/ui/button'
import { MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LiveAvatar } from '../../LiveAvatar'
import { cn } from '@/lib/utils'

interface PostCardHeaderProps {
  creator: {
    id: string
    full_name: string
    avatar_url?: string
    username?: string
    title?: string
    industry?: string
    isLive?: boolean
  }
  timestamp: string
  showAvatar?: boolean
  isOwnPost?: boolean
  onDelete?: () => void
  variant: 'column' | 'row'
  isFollowing?: boolean
  onFollowToggle?: () => void
  onConnect?: () => void
  showConnectButton?: boolean
}

export function PostCardHeader({
  creator,
  timestamp,
  showAvatar = true,
  isOwnPost = false,
  onDelete,
  variant,
  isFollowing = false,
  onFollowToggle,
  onConnect,
  showConnectButton = false,
}: PostCardHeaderProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`
    return `${Math.floor(diffInHours / 168)}w`
  }

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-3 p-3">
        {/* Column 1: Profile Picture */}
        {showAvatar && (
          <LiveAvatar
            src={creator.avatar_url}
            alt={creator.full_name}
            fallback={creator.full_name?.charAt(0).toUpperCase() || '?'}
            isLive={creator.isLive}
            isFollowing={isFollowing}
            onFollowToggle={onFollowToggle}
          />
        )}
        
        {/* Column 2: User Details (flexible, fills space) */}
        <div className="min-w-0 flex-1">
          {/* Line 1: Name | Industry */}
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-[0.96rem] truncate">
              {creator.full_name}
            </h3>
            {creator.industry && (
              <>
                <span className="text-gray-500 text-sm font-normal">|</span>
                <span className="text-sm font-normal text-foreground truncate">
                  {creator.industry}
                </span>
              </>
            )}
          </div>
          
          {/* Line 2: Title */}
          {creator.title && (
            <p className="text-sm font-normal text-gray-500 truncate">
              {creator.title}
            </p>
          )}
        </div>
        
        {/* Column 3: Connect Button (right-justified) */}
        {!isOwnPost && showConnectButton && onConnect && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onConnect()
            }}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-white bg-[#00C2D8] hover:bg-gradient-to-r hover:from-[#00C2D8] hover:to-[#008AA4] transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex-shrink-0"
          >
            Connect
          </button>
        )}
        
        {/* Delete Menu (only for own posts) */}
        {isOwnPost && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  // Column variant (for text posts)
  return (
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <h3 className="font-semibold text-[0.96rem] truncate">
            {creator.full_name}
          </h3>
          {creator.title && (
            <>
              <span className="text-gray-500 text-sm font-normal">|</span>
              <span className="text-sm font-normal text-foreground truncate">
                {creator.title}
              </span>
            </>
          )}
        </div>
        {creator.industry && (
          <p className="text-sm font-normal text-gray-500 truncate">
            {creator.industry}
          </p>
        )}
      </div>
      
      {isOwnPost && onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
