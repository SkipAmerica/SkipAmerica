import { useRef, useState, useEffect, useCallback, RefObject } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  scrollElement: HTMLElement | null
  enabled?: boolean
  pullThreshold?: number // Trigger refresh at this distance
  pullMax?: number // Maximum pull distance
}

interface UsePullToRefreshReturn {
  pullDistance: number // 0 when idle, 0-200px during pull
  pullVelocity: number // pixels/ms
  pullState: 'idle' | 'pulling' | 'releasing' | 'refreshing'
  stretchFactor: number // 0-1 normalized value for animations
  containerRef: RefObject<HTMLDivElement>
}

export function usePullToRefresh({
  onRefresh,
  scrollElement,
  enabled = true,
  pullThreshold = 80,
  pullMax = 200,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [pullVelocity, setPullVelocity] = useState(0)
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'releasing' | 'refreshing'>('idle')
  
  const startYRef = useRef(0)
  const startTimeRef = useRef(0)
  const lastYRef = useRef(0)
  const animationFrameRef = useRef<number>()

  // Calculate stretch factor (0-1)
  const stretchFactor = pullDistance / pullMax

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !scrollElement || pullState !== 'idle') return
    
    // Only activate when at top of scroll
    if (scrollElement.scrollTop !== 0) return
    
    startYRef.current = e.touches[0].clientY
    lastYRef.current = e.touches[0].clientY
    startTimeRef.current = Date.now()
    setPullState('pulling')
  }, [enabled, scrollElement, pullState])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (pullState !== 'pulling') return
    
    const currentY = e.touches[0].clientY
    const deltaY = currentY - startYRef.current
    
    // Only pull down (positive deltaY)
    if (deltaY <= 0) {
      setPullDistance(0)
      return
    }
    
    // Prevent native pull-to-refresh
    if (deltaY > 10) {
      e.preventDefault()
    }
    
    // Apply resistance curve - gets harder to pull as distance increases
    const resistance = 0.5
    const rawDistance = deltaY * resistance
    const actualDistance = Math.min(rawDistance, pullMax)
    
    // Calculate velocity
    const timeDelta = Date.now() - startTimeRef.current
    const velocity = timeDelta > 0 ? actualDistance / timeDelta : 0
    
    // Update state in animation frame for smooth performance
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setPullDistance(actualDistance)
      setPullVelocity(velocity)
    })
    
    lastYRef.current = currentY
  }, [pullState, pullMax])

  const handleTouchEnd = useCallback(async () => {
    if (pullState !== 'pulling') return
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    // Check if threshold was met
    if (pullDistance >= pullThreshold) {
      setPullState('releasing')
      
      // Haptic feedback on supported devices
      if ('Capacitor' in window) {
        try {
          const { Haptics } = (window as any).Capacitor.Plugins
          await Haptics?.notification({ type: 'success' })
        } catch (e) {
          // Ignore haptic errors
        }
      }
      
      // Trigger refresh
      setPullState('refreshing')
      try {
        await onRefresh()
      } catch (error) {
        console.error('Pull-to-refresh failed:', error)
      } finally {
        setPullState('idle')
        setPullDistance(0)
        setPullVelocity(0)
      }
    } else {
      // Not enough pull, reset
      setPullState('idle')
      setPullDistance(0)
      setPullVelocity(0)
    }
  }, [pullState, pullDistance, pullThreshold, onRefresh])

  // Attach touch event listeners
  useEffect(() => {
    if (!enabled || !scrollElement) return
    
    scrollElement.addEventListener('touchstart', handleTouchStart, { passive: true })
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: false })
    scrollElement.addEventListener('touchend', handleTouchEnd, { passive: true })
    scrollElement.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    
    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart)
      scrollElement.removeEventListener('touchmove', handleTouchMove)
      scrollElement.removeEventListener('touchend', handleTouchEnd)
      scrollElement.removeEventListener('touchcancel', handleTouchEnd)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [enabled, scrollElement, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Reset state when disabled
  useEffect(() => {
    if (!enabled) {
      setPullDistance(0)
      setPullVelocity(0)
      setPullState('idle')
    }
  }, [enabled])

  return {
    pullDistance,
    pullVelocity,
    pullState,
    stretchFactor,
    containerRef,
  }
}
