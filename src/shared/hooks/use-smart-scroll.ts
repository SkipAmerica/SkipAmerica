import { useRef, useCallback, useEffect, useState } from 'react'
import { useIntersectionObserver } from './use-intersection-observer'

export interface SmartScrollBehavior {
  autoOnNew?: boolean
  threshold?: number
  messageFlow?: 'newest-bottom' | 'newest-top'
}

export interface UseSmartScrollOptions {
  items: any[]
  scrollBehavior: SmartScrollBehavior
  onNewItems?: () => void
}

export function useSmartScroll({ items, scrollBehavior, onNewItems }: UseSmartScrollOptions) {
  const hasInitialScrolled = useRef(false)
  const previousItemCount = useRef(0)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const [isAtNewest, setIsAtNewest] = useState(false)
  
  const { 
    autoOnNew = true, 
    threshold = 24, 
    messageFlow = 'newest-bottom' 
  } = scrollBehavior

  // Calculate rootMargin based on message flow
  const rootMargin = messageFlow === 'newest-bottom' 
    ? '0px 0px 24px 0px'
    : '24px 0px 0px 0px'

  // Intersection observer for the sentinel
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    rootMargin,
  })

  // Get scroll container (ScrollArea viewport)
  const getScrollContainer = useCallback(() => {
    if (!sentinelRef.current) return null
    
    let element = sentinelRef.current.parentElement
    while (element) {
      if (element.scrollHeight > element.clientHeight) {
        return element
      }
      element = element.parentElement
    }
    return null
  }, [sentinelRef])

  // Calculate pixel distance to newest edge
  const calculateDistanceToNewest = useCallback(() => {
    const container = getScrollContainer()
    if (!container) return Infinity

    if (messageFlow === 'newest-bottom') {
      // Distance from bottom
      return container.scrollHeight - (container.scrollTop + container.clientHeight)
    } else {
      // Distance from top
      return container.scrollTop
    }
  }, [getScrollContainer, messageFlow])

  // Check if user is at newest with both intersection and distance
  const updateAtNewestState = useCallback(() => {
    const distance = calculateDistanceToNewest()
    const atNewest = isIntersecting && distance <= threshold
    setIsAtNewest(atNewest)
  }, [isIntersecting, calculateDistanceToNewest, threshold])

  // Update scroll container ref when sentinel changes
  useEffect(() => {
    scrollContainerRef.current = getScrollContainer()
  }, [getScrollContainer])

  // Update "at newest" state when intersection or scroll changes
  useEffect(() => {
    let rafId: number
    
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateAtNewestState)
    }

    updateAtNewestState()

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        container.removeEventListener('scroll', handleScroll)
        if (rafId) cancelAnimationFrame(rafId)
      }
    }
  }, [updateAtNewestState])

  // Update when intersection changes
  useEffect(() => {
    updateAtNewestState()
  }, [updateAtNewestState])

  const scrollToNewest = useCallback(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    sentinel.scrollIntoView({ 
      behavior: 'smooth',
      block: messageFlow === 'newest-top' ? 'start' : 'end'
    })
  }, [messageFlow, sentinelRef])

  const scrollToTop = useCallback(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    sentinel.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }, [sentinelRef])

  // Handle initial scroll after first load
  useEffect(() => {
    if (items.length > 0 && !hasInitialScrolled.current) {
      hasInitialScrolled.current = true
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        scrollToNewest()
      })
    }
  }, [items.length, scrollToNewest])

  // Handle new messages auto-scroll with precise distance check
  useEffect(() => {
    const currentCount = items.length
    const hadNewItems = currentCount > previousItemCount.current && previousItemCount.current > 0
    
    if (hadNewItems && autoOnNew && isAtNewest) {
      requestAnimationFrame(() => {
        scrollToNewest()
        onNewItems?.()
      })
    }
    
    previousItemCount.current = currentCount
  }, [items.length, autoOnNew, isAtNewest, scrollToNewest, onNewItems])

  return {
    sentinelRef,
    scrollToNewest,
    scrollToTop,
    isAtNewest
  }
}