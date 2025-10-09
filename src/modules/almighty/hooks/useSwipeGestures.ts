import { useRef, useCallback } from 'react'
import { Pane, useUIContext } from '../providers/UIProvider'

export function useSwipeGestures() {
  const { activePane, setActivePane, swipeLocked, setDragging } = useUIContext()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false

  const snapToPane = useCallback((deltaX: number, velocity: number) => {
    const threshold = typeof window !== 'undefined' ? window.innerWidth * 0.3 : 300

    // Disable velocity flings for reduced motion
    if (!prefersReducedMotion && Math.abs(velocity) > 0.5) {
      return velocity < 0 ? activePane + 1 : activePane - 1
    }

    // Distance-based threshold
    if (deltaX > threshold) return activePane - 1
    if (deltaX < -threshold) return activePane + 1
    return activePane
  }, [activePane, prefersReducedMotion])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary || swipeLocked) return

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
      pointerIdRef.current = e.pointerId
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Gesture] Failed to capture pointer:', err)
      }
    }

    setDragging(true)
    startX.current = e.clientX
    startY.current = e.clientY
    startTime.current = Date.now()
  }, [swipeLocked, setDragging])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary || swipeLocked) return

    const deltaX = e.clientX - startX.current
    const deltaY = e.clientY - startY.current

    // Left-edge guard: prevent iOS back-swipe
    if (e.clientX <= 12 && activePane === Pane.LEFT) {
      e.preventDefault()
      return
    }

    // Horizontal dead-zone: if scrolling vertically, don't start horizontal swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 8) {
      setDragging(false)
      return
    }

    requestAnimationFrame(() => {
      // Visual feedback handled by parent transform
    })
  }, [swipeLocked, activePane, setDragging])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return

    const msHeld = Date.now() - startTime.current
    const deltaX = e.clientX - startX.current
    const distance = Math.abs(deltaX)
    const velocity = deltaX / msHeld

    const targetPane = snapToPane(deltaX, velocity)
    const clampedPane = Math.max(Pane.LEFT, Math.min(Pane.RIGHT, targetPane)) as Pane

    // Release pointer capture
    if (pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Gesture] Failed to release pointer capture:', err)
        }
      }
      pointerIdRef.current = null
    }

    // Single batched analytics event
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics] gesture_end', {
        from: activePane,
        to: clampedPane,
        velocity,
        distance,
        msHeld,
        didSwitch: clampedPane !== activePane
      })
    }

    setActivePane(clampedPane, { velocity, msHeld })
    setDragging(false)
  }, [activePane, setActivePane, setDragging, snapToPane])

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Gesture] Pointer cancelled - resetting')
    }

    if (pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch (err) {
        // Silent fail
      }
      pointerIdRef.current = null
    }

    setDragging(false)
  }, [setDragging])

  return {
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel
  }
}
