import { useRef, useCallback, useEffect } from 'react'
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
  
  const { 
    autoOnNew = true, 
    threshold = 100, 
    messageFlow = 'newest-bottom' 
  } = scrollBehavior

  // Intersection observer for the sentinel
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    rootMargin: `${threshold}px`,
  })

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

  // Handle new messages auto-scroll
  useEffect(() => {
    const currentCount = items.length
    const hadNewItems = currentCount > previousItemCount.current && previousItemCount.current > 0
    
    if (hadNewItems && autoOnNew && isIntersecting) {
      requestAnimationFrame(() => {
        scrollToNewest()
        onNewItems?.()
      })
    }
    
    previousItemCount.current = currentCount
  }, [items.length, autoOnNew, isIntersecting, scrollToNewest, onNewItems])

  return {
    sentinelRef,
    scrollToNewest,
    scrollToTop,
    isAtNewest: isIntersecting
  }
}