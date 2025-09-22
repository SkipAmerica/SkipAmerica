import { useState, useRef, useCallback, useEffect } from 'react'
import { useLiveStore } from '@/stores/live-store'

interface DragState {
  isDragging: boolean
  dragY: number // Current Y position (0 = collapsed at bottom, negative = dragged up)
  startY: number
  startDragY: number
  velocity: number
  lastMoveTime: number
  lastMoveY: number
}

interface DragPosition {
  collapsed: number // 0 - at bottom nav
  quarter: number // -25% of screen
  half: number // -50% of screen
  threequarter: number // -75% of screen
  extended: number // Near status bar
}

export function useDragHandler(elementRef: React.RefObject<HTMLElement>) {
  const store = useLiveStore()
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragY: 0,
    startY: 0,
    startDragY: 0,
    velocity: 0,
    lastMoveTime: 0,
    lastMoveY: 0
  })

  const animationFrameRef = useRef<number>()
  const velocityTrackingRef = useRef<Array<{ y: number; time: number }>>([])

  // Calculate snap positions based on viewport
  const getSnapPositions = useCallback((): DragPosition => {
    const vh = window.innerHeight
    const statusBarHeight = 44 // iOS status bar
    const tabBarHeight = 80 // Approximate tab bar height
    const maxDrag = -(vh - statusBarHeight - tabBarHeight)
    
    return {
      collapsed: 0,
      quarter: maxDrag * 0.25,
      half: maxDrag * 0.5,
      threequarter: maxDrag * 0.75,
      extended: maxDrag
    }
  }, [])

  // Find nearest snap position
  const findNearestSnap = useCallback((currentY: number, velocity: number): number => {
    const positions = getSnapPositions()
    const snapValues = Object.values(positions)
    
    // If high velocity, predict where user wants to go
    if (Math.abs(velocity) > 800) {
      if (velocity < 0) {
        // Fast upward swipe - go to next higher position
        const nextUp = snapValues.find(pos => pos < currentY)
        if (nextUp !== undefined) return nextUp
      } else {
        // Fast downward swipe - go to next lower position  
        const nextDown = snapValues.reverse().find(pos => pos > currentY)
        if (nextDown !== undefined) return nextDown
      }
    }

    // Otherwise find closest position
    return snapValues.reduce((closest, current) => 
      Math.abs(current - currentY) < Math.abs(closest - currentY) ? current : closest
    )
  }, [getSnapPositions])

  // Animate to target position
  const animateToPosition = useCallback((targetY: number, duration = 300) => {
    const startY = dragState.dragY
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Cubic bezier easing for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentY = startY + (targetY - startY) * easeOut
      
      setDragState(prev => ({ ...prev, dragY: currentY }))
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDragState(prev => ({ ...prev, isDragging: false, velocity: 0 }))
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [dragState.dragY])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!elementRef.current) return
    
    const touch = e.touches[0]
    const rect = elementRef.current.getBoundingClientRect()
    
    // Only start drag if touching the DSB panel
    if (touch.clientY < rect.top || touch.clientY > rect.bottom) return
    
    e.preventDefault()
    
    const now = performance.now()
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      startY: touch.clientY,
      startDragY: prev.dragY,
      lastMoveTime: now,
      lastMoveY: touch.clientY,
      velocity: 0
    }))
    
    // Clear velocity tracking
    velocityTrackingRef.current = [{ y: touch.clientY, time: now }]
    
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    // Trigger haptic feedback
    store.triggerHaptic()
  }, [elementRef, store])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragState.isDragging) return
    
    e.preventDefault()
    const touch = e.touches[0]
    const deltaY = touch.clientY - dragState.startY
    const newDragY = dragState.startDragY + deltaY
    
    // Constrain to valid range
    const positions = getSnapPositions()
    const constrainedY = Math.max(positions.extended, Math.min(positions.collapsed, newDragY))
    
    const now = performance.now()
    
    // Track velocity
    velocityTrackingRef.current.push({ y: touch.clientY, time: now })
    if (velocityTrackingRef.current.length > 5) {
      velocityTrackingRef.current.shift()
    }
    
    setDragState(prev => ({
      ...prev,
      dragY: constrainedY,
      lastMoveTime: now,
      lastMoveY: touch.clientY
    }))
  }, [dragState.isDragging, dragState.startY, dragState.startDragY, getSnapPositions])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!dragState.isDragging) return
    
    e.preventDefault()
    
    // Calculate velocity from recent tracking points
    let velocity = 0
    if (velocityTrackingRef.current.length >= 2) {
      const recent = velocityTrackingRef.current.slice(-3)
      const timeDiff = recent[recent.length - 1].time - recent[0].time
      const yDiff = recent[recent.length - 1].y - recent[0].y
      velocity = timeDiff > 0 ? (yDiff / timeDiff) * 1000 : 0 // px/second
    }
    
    const targetY = findNearestSnap(dragState.dragY, velocity)
    animateToPosition(targetY)
    
    // Light haptic feedback at end
    setTimeout(() => store.triggerHaptic(), 50)
  }, [dragState.isDragging, dragState.dragY, findNearestSnap, animateToPosition, store])

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Reset position when DSB becomes visible/hidden
  useEffect(() => {
    if (!store.isDiscoverable || store.isLive) {
      setDragState(prev => ({ ...prev, dragY: 0, isDragging: false }))
    }
  }, [store.isDiscoverable, store.isLive])

  return {
    dragY: dragState.dragY,
    isDragging: dragState.isDragging,
    snapPositions: getSnapPositions()
  }
}
