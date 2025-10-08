import { useDoubleTap } from '@/hooks/use-double-tap'
import { useUIContext } from '../providers/UIProvider'

interface PIPProps {
  role: 'creator' | 'user'
  onDoubleTap: () => void
}

export function PIP({ role, onDoubleTap }: PIPProps) {
  const { onTapStart } = useDoubleTap({ onDoubleTap, delay: 300 })
  const { chatOpen } = useUIContext()

  return (
    <div
      className="absolute z-40"
      style={{
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        right: 'calc(16px + env(safe-area-inset-right))',
        left: 'calc(16px + env(safe-area-inset-left))',
        width: 112,
        height: 112,
        pointerEvents: chatOpen ? 'none' : 'auto',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
      onPointerDown={onTapStart}
    >
      <div className="w-24 h-24 bg-gray-700 rounded-lg border-2 border-white/20 flex items-center justify-center text-xs text-white">
        {role === 'creator' ? 'Creator' : 'User'}
      </div>
    </div>
  )
}
