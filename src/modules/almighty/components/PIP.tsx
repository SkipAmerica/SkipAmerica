import { useDoubleTap } from '@/hooks/use-double-tap'
import { cn } from '@/lib/utils'
import VideoTile, { TrackRef } from './VideoTile'

interface PIPProps {
  trackRef?: TrackRef
  mirror?: boolean
  onDoubleTap: () => void
  className?: string
  rounded?: boolean
  sessionId?: string
}

export function PIP({ trackRef, mirror, onDoubleTap, className, rounded = true, sessionId }: PIPProps) {
  const { onTapStart } = useDoubleTap({ onDoubleTap, delay: 300 })

  return (
    <div
      className={cn("relative", className)}
      onPointerDown={onTapStart}
      style={{
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
    >
      <VideoTile
        key={
          trackRef?.track?.sid ||
          trackRef?.track?.mediaStreamTrack?.id ||
          (trackRef?.isLocal ? 'local' : 'remote')
        }
        trackRef={trackRef}
        mirror={mirror}
        rounded={rounded}
        className="w-full h-full border-2 border-white/20"
        slot="pip"
        sessionId={sessionId}
      />
    </div>
  )
}
