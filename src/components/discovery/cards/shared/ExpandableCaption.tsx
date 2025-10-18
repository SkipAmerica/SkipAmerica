import { useEffect, useRef, useState } from 'react'
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
  const containerRef = useRef<HTMLSpanElement | HTMLParagraphElement | null>(null)
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto')
  const [collapsedHeight, setCollapsedHeight] = useState<number>(0)

  if (!text) return null

  const shouldTruncate = text.length > maxLength

  // Measure 2-line collapsed height based on computed line-height
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const lh = parseFloat(getComputedStyle(el).lineHeight || '0')
    const collapsed = Math.max(1, Math.round((isNaN(lh) ? 20 : lh) * 2))
    setCollapsedHeight(collapsed)
  }, [text, inline])

  // Initialize or update height when collapsed height recalculates
  useEffect(() => {
    if (!shouldTruncate) {
      setContainerHeight('auto')
      return
    }
    if (!isExpanded && collapsedHeight) {
      setContainerHeight(collapsedHeight)
    }
  }, [collapsedHeight, shouldTruncate, isExpanded])

  // Animate on expand/collapse
  useEffect(() => {
    const el = containerRef.current
    if (!el || !shouldTruncate || !collapsedHeight) return

    if (isExpanded) {
      // Expand: from current height to scrollHeight, then set to auto
      const start = el.getBoundingClientRect().height
      const end = el.scrollHeight
      setContainerHeight(start)
      requestAnimationFrame(() => setContainerHeight(end))
      const onEnd = () => {
        setContainerHeight('auto')
        el.removeEventListener('transitionend', onEnd)
      }
      el.addEventListener('transitionend', onEnd)
    } else {
      // Collapse: from current height to collapsedHeight
      const start = el.getBoundingClientRect().height
      setContainerHeight(start)
      requestAnimationFrame(() => setContainerHeight(collapsedHeight))
    }
  }, [isExpanded, shouldTruncate, collapsedHeight])

  // For inline mode with animated height
  if (inline) {
    if (!shouldTruncate) {
      return (
        <span className={cn("inline", className)}>
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
      )
    }

    return (
      <span className={cn("inline", className)}>
        <span
          ref={containerRef as any}
          className="inline-block text-foreground text-sm font-normal leading-relaxed overflow-hidden align-top transition-[height] duration-300 ease-out"
          style={{ height: containerHeight as any, willChange: 'height' }}
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-muted-foreground font-bold hover:underline hover:bg-transparent inline"
        >
          {isExpanded ? 'less' : '...more'}
        </Button>
      </span>
    )
  }

  // For block mode with animated height
  return (
    <div className="relative">
      <p
        ref={containerRef as any}
        className={cn(
          "text-foreground text-sm font-normal leading-relaxed overflow-hidden transition-[height] duration-300 ease-out",
          className
        )}
        style={{ height: containerHeight as any, willChange: 'height' }}
      >
        {text}
      </p>
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-muted-foreground font-bold hover:underline hover:bg-transparent mt-1"
        >
          {isExpanded ? 'less' : '...more'}
        </Button>
      )}
    </div>
  )
}
