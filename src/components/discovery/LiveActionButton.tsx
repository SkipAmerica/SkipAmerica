import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface LiveActionButtonProps {
  icon: LucideIcon
  color: 'green' | 'blue'
  onPress: () => void
  className?: string
}

export function LiveActionButton({ icon: Icon, color, onPress, className }: LiveActionButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    setIsPressed(true)
    setIsDragging(false)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPressed(true)
    setIsDragging(false)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    const element = e.currentTarget
    const rect = element.getBoundingClientRect()
    
    // Check if touch is still within button bounds
    const isWithinBounds = 
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom

    if (!isWithinBounds) {
      setIsDragging(true)
      setIsPressed(false)
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    if (!isDragging && isPressed) {
      onPress()
    }
    setIsPressed(false)
    setIsDragging(false)
  }, [isDragging, isPressed, onPress])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging && isPressed) {
      onPress()
    }
    setIsPressed(false)
    setIsDragging(false)
  }, [isDragging, isPressed, onPress])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(true)
    setIsPressed(false)
  }, [])

  const colorClasses = {
    green: 'bg-green-500 hover:bg-green-600',
    blue: 'bg-blue-500 hover:bg-blue-600'
  }

  return (
    <button
      className={cn(
        'h-8 w-8 rounded-full text-white shadow-lg transition-all duration-150 flex items-center justify-center',
        colorClasses[color],
        isPressed && 'scale-95 shadow-md',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}