import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface GoLiveCountdownProps {
  onComplete: () => void
  onCancel: () => void
}

export function GoLiveCountdown({ onComplete, onCancel }: GoLiveCountdownProps) {
  const [count, setCount] = useState(3)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (count === 0) {
      onComplete()
      return
    }

    setIsAnimating(true)
    const timer = setTimeout(() => {
      setIsAnimating(false)
      setTimeout(() => setCount(c => c - 1), 100)
    }, 900)

    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <div 
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className={cn(
            "text-[10rem] font-bold text-white transition-all duration-300",
            "drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]",
            isAnimating ? "scale-125 opacity-0" : "scale-100 opacity-100"
          )}
        >
          {count}
        </div>
        <p className="text-white/80 text-sm mt-4">
          Double tap to cancel
        </p>
      </div>
    </div>
  )
}
