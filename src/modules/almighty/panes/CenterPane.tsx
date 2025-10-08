import { PIP } from '../components/PIP'
import { ChatDrawer } from '../components/ChatDrawer'
import { useUIContext } from '../providers/UIProvider'
import { useChatDrawerGesture } from '../hooks/useChatDrawerGesture'
import { useRef } from 'react'

export function CenterPane() {
  const { pipPrimary, swapPIP, chatOpen } = useUIContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    drawerTranslateY,
    handleChatTouchStart,
    handleChatTouchMove,
    handleChatTouchEnd
  } = useChatDrawerGesture(containerRef)

  const hotZoneHeight = typeof window !== 'undefined' && window.innerWidth < 360 ? 28 : 32

  return (
    <div ref={containerRef} className="relative h-full bg-black overflow-hidden">
      {/* Chat Hot-Zone */}
      <div
        className="absolute left-0 right-0 z-50"
        style={{
          top: 0,
          height: hotZoneHeight,
          touchAction: 'pan-y',
          WebkitTouchCallout: 'none',
          userSelect: 'none'
        }}
        onTouchStart={handleChatTouchStart}
        onTouchMove={handleChatTouchMove}
        onTouchEnd={handleChatTouchEnd}
      />

      {/* Primary Video Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[480px] h-[480px] bg-gray-800 rounded-lg flex items-center justify-center text-white text-lg">
          {pipPrimary === 'creator' ? 'Creator View' : 'User View'}
        </div>
      </div>

      {/* PIP */}
      <PIP
        role={pipPrimary === 'creator' ? 'user' : 'creator'}
        onDoubleTap={swapPIP}
      />

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        translateY={drawerTranslateY}
        onTouchStart={handleChatTouchStart}
        onTouchMove={handleChatTouchMove}
        onTouchEnd={handleChatTouchEnd}
      />
    </div>
  )
}
