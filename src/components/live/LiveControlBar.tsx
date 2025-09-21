import { useState } from 'react'
import { Users, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLive } from '@/app/providers/live-provider'
import { QueueDrawer } from './QueueDrawer'
import { cn } from '@/lib/utils'

export function LiveControlBar() {
  const [showQueue, setShowQueue] = useState(false)
  const { 
    queueCount, 
    rightDisplayMode, 
    elapsedTime, 
    earningsDisplay, 
    toggleRightDisplay 
  } = useLive()

  const handleQueueClick = () => {
    setShowQueue(true)
  }

  const handleRightDisplayToggle = () => {
    toggleRightDisplay()
  }

  return (
    <>
      <div className="fixed bottom-[calc(49px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4">
        <div className="bg-[hsl(var(--live-color))] rounded-t-2xl shadow-lg h-10 flex items-center">
          {/* Left: Queue Button (25%) */}
          <div className="flex-[0.25] flex justify-center">
            <Button
              size="sm"
              onClick={handleQueueClick}
              className="flex items-center gap-2 text-white bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-2 h-auto"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">{queueCount}</span>
            </Button>
          </div>

          {/* Center: Live Pill (50%) */}
          <div className="flex-[0.5] flex justify-center">
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
              <div 
                className={cn(
                  "w-2 h-2 bg-white rounded-full",
                  "animate-pulse"
                )}
                style={{
                  animationDuration: '2s',
                  animationIterationCount: 'infinite'
                }}
              />
              <span className="text-white font-semibold text-sm">LIVE</span>
            </div>
          </div>

          {/* Right: Time/Earnings Toggle (25%) */}
          <div className="flex-[0.25] flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRightDisplayToggle}
              className="flex items-center gap-1 text-white hover:bg-white/10 px-3 py-2 h-auto min-w-0"
            >
              {rightDisplayMode === 'time' ? (
                <>
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-xs truncate">{elapsedTime}</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-xs truncate">{earningsDisplay}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <QueueDrawer 
        isOpen={showQueue} 
        onClose={() => setShowQueue(false)} 
      />
    </>
  )
}