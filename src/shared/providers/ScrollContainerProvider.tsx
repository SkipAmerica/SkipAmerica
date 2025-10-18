import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface ScrollContainerContextValue {
  rootEl: HTMLElement | null
}

const ScrollContainerContext = createContext<ScrollContainerContextValue | null>(null)

export function useScrollContainer() {
  const context = useContext(ScrollContainerContext)
  if (!context) {
    throw new Error('useScrollContainer must be used within ScrollContainerProvider')
  }
  return context
}

interface ScrollContainerProviderProps {
  children: React.ReactNode
}

export function ScrollContainerProvider({ children }: ScrollContainerProviderProps) {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null)
  const location = useLocation()

  useEffect(() => {
    const resolveContainer = () => {
      const el = document.querySelector('[data-scroll-container]') as HTMLElement | null
      if (el !== rootEl) {
        setRootEl(el)
      }
    }

    // Resolve immediately
    resolveContainer()

    // Re-check on resize and visibility change
    window.addEventListener('resize', resolveContainer)
    document.addEventListener('visibilitychange', resolveContainer)

    return () => {
      window.removeEventListener('resize', resolveContainer)
      document.removeEventListener('visibilitychange', resolveContainer)
    }
  }, [location.pathname, rootEl])

  return (
    <ScrollContainerContext.Provider value={{ rootEl }}>
      {children}
    </ScrollContainerContext.Provider>
  )
}
