import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface GoLiveCountdownProps {
  onComplete: () => void
  onCancel: () => void
}

export function GoLiveCountdown({ onComplete, onCancel }: GoLiveCountdownProps) {
  const [count, setCount] = useState(3)
  const [isAnimating, setIsAnimating] = useState(false)

  // Cache onComplete to prevent effect restarts
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Log component mount/unmount
  useEffect(() => {
    console.log('[GoLiveCountdown] 🎬 Countdown mounted with initial count:', count)
    return () => {
      console.log('[GoLiveCountdown] 🎬 Countdown unmounting at count:', count)
    }
  }, [])

  useEffect(() => {
    console.log('[GoLiveCountdown] ⏱️ Timer effect triggered', {
      count,
      isAnimating,
      willCallComplete: count === 0
    })
    
    if (count === 0) {
      console.log('[GoLiveCountdown] ✅ Countdown complete - calling onComplete')
      onCompleteRef.current?.()
      return
    }

    setIsAnimating(true)
    console.log('[GoLiveCountdown] 🎭 Animation started for count:', count)
    
    const timer = setTimeout(() => {
      console.log('[GoLiveCountdown] 🎭 Animation finished for count:', count)
      setIsAnimating(false)
      setTimeout(() => {
        console.log('[GoLiveCountdown] ⏬ Decrementing count from', count, 'to', count - 1)
        setCount(c => c - 1)
      }, 100)
    }, 900)

    return () => {
      console.log('[GoLiveCountdown] 🧹 Cleaning up timer for count:', count)
      clearTimeout(timer)
    }
  }, [count])

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
