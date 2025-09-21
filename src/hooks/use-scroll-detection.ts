import { useEffect, useState, useRef } from 'react'

export interface UseScrollDetectionOptions {
  threshold?: number
  throttleMs?: number
}

export function useScrollDetection(options: UseScrollDetectionOptions = {}) {
  const { threshold = 10, throttleMs = 16 } = options
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const lastScrollTime = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now()
      
      // Throttle scroll events
      if (now - lastScrollTime.current < throttleMs) {
        return
      }
      lastScrollTime.current = now

      // Find the scroll container
      const scrollContainer = document.querySelector('[data-scroll-container]') as HTMLElement
      const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY
      
      // Only trigger scrolling state if we've moved past the threshold
      if (Math.abs(currentScrollY - scrollY) > threshold) {
        setScrollY(currentScrollY)
        setIsScrolling(true)
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        
        // Set timeout to detect when scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false)
        }, 150)
      }
    }

    // Find the scroll container or fallback to window
    const scrollContainer = document.querySelector('[data-scroll-container]') as HTMLElement
    const target = scrollContainer || window
    
    target.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      target.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [threshold, throttleMs])

  return {
    isScrolling,
    scrollY,
  }
}