import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HalfStarRatingProps {
  value: number // 0-5 in 0.5 increments
  onChange?: (value: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  className?: string
}

export function HalfStarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  readOnly = false,
  className
}: HalfStarRatingProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size]

  const handleClick = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (readOnly || !onChange) return

    const rect = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const isLeftHalf = offsetX < rect.width / 2

    const newValue = index + (isLeftHalf ? 0.5 : 1)
    onChange(newValue)
  }

  return (
    <div className={cn('flex gap-1', className)}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const fillPercentage = Math.max(0, Math.min(1, value - i))
        
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => handleClick(i, e)}
            disabled={readOnly}
            className={cn(
              'relative transition-transform hover:scale-110',
              !readOnly && 'cursor-pointer',
              readOnly && 'cursor-default'
            )}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(sizeClass, 'text-muted-foreground')}
              fill="none"
              strokeWidth={1.5}
            />
            
            {/* Filled overlay */}
            {fillPercentage > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage * 100}%` }}
              >
                <Star
                  className={cn(sizeClass, 'text-[hsl(var(--turquoise))]')}
                  fill="hsl(var(--turquoise))"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
