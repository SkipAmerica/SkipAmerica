/**
 * Live Control Bar - Re-enabled with proper state machine integration
 */

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Clock, DollarSign, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLive } from '@/hooks/live'
import { QueueDrawer } from './QueueDrawer'
import { useToast } from '@/hooks/use-toast'
import { LiveErrorBoundary } from './LiveErrorBoundary'

function LiveControlBarContent() {
  const { 
    isLive, 
    state, 
    queueCount, 
    elapsedTime, 
    earningsDisplay, 
    rightDisplayMode, 
    toggleRightDisplay
  } = useLive()
  
  const [showQueueDrawer, setShowQueueDrawer] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const { toast } = useToast()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const handleQueueClick = useCallback(() => {
    setShowQueueDrawer(true)
  }, [])
  
  const handleRightDisplayToggle = useCallback(() => {
    if (isToggling) return
    setIsToggling(true)
    toggleRightDisplay()
    setTimeout(() => setIsToggling(false), 200)
  }, [isToggling, toggleRightDisplay])
  
  // Don't render when offline
  if (!isLive && state === 'OFFLINE') {
    return null
  }

  // Add body class for live state
  React.useEffect(() => {
    if (state !== 'OFFLINE') {
      document.body.classList.add('live-active')
    } else {
      document.body.classList.remove('live-active')
    }
    
    return () => {
      document.body.classList.remove('live-active')
    }
  }, [state])
  
  return (
    <>
      <div 
        className={cn(
          "fixed bottom-[49px] left-0 right-0 z-40",
          "h-14 bg-card/95 backdrop-blur-md border-t border-border/30",
          "flex items-center justify-between px-4 shadow-lg",
          "transform transition-transform duration-300 ease-in-out",
          state === 'OFFLINE' ? "translate-y-full" : "translate-y-0"
        )}
        role="toolbar"
        aria-label="Live session controls"
      >
        {/* Left: Queue */}
        <div className="flex-1 flex justify-start">
          <Button variant="ghost" size="sm" onClick={handleQueueClick} className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">{queueCount}</span>
          </Button>
        </div>
        
        {/* Center: Live Status */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-live/10 rounded-full border border-live/20">
            {state === 'STARTING' || state === 'ENDING' ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border border-live border-t-transparent" />
                <span className="text-sm font-medium text-live">
                  {state === 'STARTING' ? 'Going Live...' : 'Ending...'}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-live rounded-full animate-pulse" />
                <span className="text-sm font-medium text-live">Live</span>
              </>
            )}
          </div>
        </div>
        
        {/* Right: Time/Earnings */}
        <div className="flex-1 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleRightDisplayToggle} disabled={isToggling} className="flex items-center gap-2">
            {rightDisplayMode === 'time' ? (
              <>
                <Clock className="w-4 h-4" />
                <span className="font-medium font-mono text-sm">{elapsedTime}</span>
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                <span className="font-medium text-sm">{earningsDisplay}</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      <QueueDrawer isOpen={showQueueDrawer} onClose={() => setShowQueueDrawer(false)} />
    </>
  )
}

export function LiveControlBar() {
  return (
    <LiveErrorBoundary>
      <LiveControlBarContent />
    </LiveErrorBoundary>
  )
}