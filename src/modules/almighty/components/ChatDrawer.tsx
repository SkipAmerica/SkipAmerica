interface ChatDrawerProps {
  isOpen: boolean
  translateY: number
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function ChatDrawer({
  isOpen,
  translateY,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}: ChatDrawerProps) {
  return (
    <div
      className="absolute inset-0 bg-black/80 flex flex-col z-[60]"
      style={{
        transform: `translateY(${translateY}px)`,
        touchAction: 'pan-y',
        pointerEvents: isOpen ? 'auto' : 'none',
        visibility: isOpen ? 'visible' : 'hidden',
        paddingTop: 'calc(12px + env(safe-area-inset-top))'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-hidden={!isOpen}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="w-12 h-1 bg-white/20 rounded-full" />
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2 text-white" dir="auto">
          <div className="bg-white/10 p-3 rounded-lg">Mock message 1</div>
          <div className="bg-white/10 p-3 rounded-lg">Mock message 2</div>
          <div className="bg-white/10 p-3 rounded-lg">Mock message 3</div>
        </div>
      </div>
    </div>
  )
}
