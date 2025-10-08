import React, { createContext, useContext, useState, useCallback } from 'react'

export enum Pane {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2
}

interface UIContextValue {
  activePane: Pane
  setActivePane: (pane: Pane, analytics?: { velocity: number; msHeld: number }) => void
  chatOpen: boolean
  toggleChat: (open: boolean, analytics?: { duration: number }) => void
  pipPrimary: 'creator' | 'user'
  swapPIP: () => void
  swipeLocked: boolean
  lockSwipe: (locked: boolean) => void
  isDragging: boolean
  setDragging: (dragging: boolean) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [activePane, _setActivePane] = useState<Pane>(Pane.CENTER)
  const [chatOpen, _setChatOpen] = useState(false)
  const [pipPrimary, setPipPrimary] = useState<'creator' | 'user'>('creator')
  const [swipeLocked, setSwipeLocked] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const setActivePane = useCallback((newPane: Pane, analytics?: { velocity: number; msHeld: number }) => {
    const clampedPane = Math.max(Pane.LEFT, Math.min(Pane.RIGHT, newPane)) as Pane
    
    if (clampedPane === activePane) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics] pane_switch', {
        from: activePane,
        to: clampedPane,
        velocity: analytics?.velocity ?? 0,
        msHeld: analytics?.msHeld ?? 0
      })
    }

    _setActivePane(clampedPane)
  }, [activePane])

  const toggleChat = useCallback((open: boolean, analytics?: { duration: number }) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics] chat_${open ? 'open' : 'close'}`, {
        duration: analytics?.duration ?? 0
      })
    }
    _setChatOpen(open)
  }, [])

  const swapPIP = useCallback(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics] pip_swap', { from: pipPrimary, to: pipPrimary === 'creator' ? 'user' : 'creator' })
    }
    setPipPrimary(prev => prev === 'creator' ? 'user' : 'creator')
  }, [pipPrimary])

  return (
    <UIContext.Provider
      value={{
        activePane,
        setActivePane,
        chatOpen,
        toggleChat,
        pipPrimary,
        swapPIP,
        swipeLocked,
        lockSwipe: setSwipeLocked,
        isDragging,
        setDragging: setIsDragging
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUIContext() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUIContext must be used within UIProvider')
  }
  return context
}
