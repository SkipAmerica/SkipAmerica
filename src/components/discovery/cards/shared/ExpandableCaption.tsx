import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
  const displayText = shouldTruncate && !isExpanded 
    ? text.slice(0, maxLength) 
    : text

  const Component = inline ? 'span' : 'p'

  return (
    <Component className={`text-foreground text-sm font-normal leading-relaxed ${className}`}>
      {displayText}
      {shouldTruncate && !isExpanded && '... '}
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-primary hover:underline hover:bg-transparent inline"
        >
          {isExpanded ? 'less' : 'more'}
        </Button>
      )}
    </Component>
  )
}
