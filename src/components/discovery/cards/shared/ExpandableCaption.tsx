import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExpandableCaptionProps {
  text: string
  maxLength?: number
  className?: string
  inline?: boolean
}

export function ExpandableCaption({ text, maxLength = 75, className = '', inline = false }: ExpandableCaptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!text) return null
  
  const shouldTruncate = text.length > maxLength
  const Component = inline ? 'span' : 'p'

  return (
    <div className="relative">
      <Component 
        className={cn(
          "text-foreground text-sm font-normal leading-relaxed transition-all duration-300 ease-out overflow-hidden",
          !isExpanded && "line-clamp-3",
          className
        )}
      >
        {text}
      </Component>
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
