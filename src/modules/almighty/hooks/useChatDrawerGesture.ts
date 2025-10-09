import { useState, useRef, useCallback } from 'react'
import { useUIContext } from '../providers/UIProvider'

export function useChatDrawerGesture(containerRef: React.RefObject<HTMLDivElement>) {
  const { chatOpen, toggleChat } = useUIContext()
  const [drawerTranslateY, setDrawerTranslateY] = useState(
    typeof window !== 'undefined' ? -window.innerHeight : -1000
  )
  const startY = useRef(0)
  const openTime = useRef(0)

  const getContainerHeight = useCallback(() => {
    return containerRef.current?.clientHeight || window.innerHeight
  }, [containerRef])

  const handleChatTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return

    startY.current = e.touches[0].clientY
    if (chatOpen) {
      openTime.current = Date.now()
    }
  }, [chatOpen])

  const handleChatTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return

    const deltaY = e.touches[0].clientY - startY.current
    const containerHeight = getContainerHeight()

    if (chatOpen) {
      setDrawerTranslateY(Math.min(0, deltaY))
    } else if (deltaY > 0) {
      setDrawerTranslateY(-containerHeight + deltaY)
    }
  }, [chatOpen, getContainerHeight])

  const handleChatTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startY.current
    const containerHeight = getContainerHeight()

    if (!chatOpen && deltaY > 100) {
      toggleChat(true)
      setDrawerTranslateY(0)
    } else if (chatOpen && deltaY < -100) {
      const duration = Date.now() - openTime.current
      toggleChat(false, { duration })
      setDrawerTranslateY(-containerHeight)
    } else {
      setDrawerTranslateY(chatOpen ? 0 : -containerHeight)
    }
  }, [chatOpen, toggleChat, getContainerHeight])

  return {
    drawerTranslateY,
    handleChatTouchStart,
    handleChatTouchMove,
    handleChatTouchEnd
  }
}
