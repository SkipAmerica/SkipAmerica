import { useDoubleTap } from '@/hooks/use-double-tap'
import { useUIContext } from '../providers/UIProvider'
import VideoTile, { TrackRef } from './VideoTile'

interface PIPProps {
  trackRef?: TrackRef
  mirror?: boolean
  onDoubleTap: () => void
}

export function PIP({ trackRef, mirror, onDoubleTap }: PIPProps) {
  const { onTapStart } = useDoubleTap({ onDoubleTap, delay: 300 })
  const { chatOpen } = useUIContext()

  return (
    <div
      className="absolute z-40"
      style={{
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        right: 'calc(16px + env(safe-area-inset-right))',
        width: 112,
        height: 112,
        pointerEvents: chatOpen ? 'none' : 'auto',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
      onPointerDown={onTapStart}
    >
      <VideoTile
        key={
          trackRef?.track?.sid ||
          trackRef?.track?.mediaStreamTrack?.id ||
          (trackRef?.isLocal ? 'local' : 'remote')
        }
        trackRef={trackRef}
        mirror={mirror}
        rounded
        className="w-24 h-24 border-2 border-white/20"
      />
      
      {/* TODO: Phase 1C - Make PIP draggable within safe-area bounds */}
    </div>
  )
}
