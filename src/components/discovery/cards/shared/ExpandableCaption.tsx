import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExpandableCaptionProps {
  text: string
  maxLength?: number
  className?: string
  inline?: boolean
  usernameLength?: number
}

export function ExpandableCaption({ text, maxLength = 75, className = '', inline = false, usernameLength = 0 }: ExpandableCaptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!text) return null
  
  const shouldTruncate = text.length > maxLength

  // For inline mode, simple line-clamp toggle
  if (inline) {
    return (
      <span className={cn("inline", className)}>
        <span 
          className={cn(
            "inline text-foreground text-sm font-normal leading-relaxed transition-opacity duration-200",
            !isExpanded && "line-clamp-3"
          )}
        >
          {usernameLength > 0 ? (
            <>
              <span className="font-semibold">
                {text.substring(0, usernameLength)}
              </span>
              {text.substring(usernameLength)}
            </>
          ) : (
            text
          )}
        </span>
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-auto text-primary hover:underline hover:bg-transparent inline ml-1"
          >
            {isExpanded ? 'less' : 'more'}
          </Button>
        )}
      </span>
    )
  }

  // For block mode, use line-clamp
  return (
    <div className="relative">
      <p 
        className={cn(
          "text-foreground text-sm font-normal leading-relaxed transition-all duration-300 ease-out overflow-hidden",
          !isExpanded && "line-clamp-3",
          className
        )}
      >
        {text}
      </p>
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-primary hover:underline hover:bg-transparent mt-1"
        >
          {isExpanded ? 'less' : 'more'}
        </Button>
      )}
    </div>
  )
}
