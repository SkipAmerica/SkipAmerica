import { useState, useCallback, useEffect, useRef } from 'react'
import { Users, Clock, DollarSign, AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLive } from '@/hooks/live';
import { QueueDrawer } from './QueueDrawer'
import { LiveErrorBoundary } from './LiveErrorBoundary'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

function LiveControlBarContent() {
  const [showQueue, setShowQueue] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const toggleTimeoutRef = useRef<NodeJS.Timeout>()
  const { toast } = useToast()
  
  const { 
    isLive,
    queueCount, 
    rightDisplayMode, 
    elapsedTime, 
    earningsDisplay, 
    toggleRightDisplay,
    hasErrors,
    sessionError,
    queueError
  } = useLive()

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current)
      }
    }
  }, [])

  const handleQueueClick = useCallback(() => {
    if (hasErrors) {
      toast({
        title: "Queue Unavailable",
        description: "Please check your connection and try again.",
        variant: "destructive"
      })
      return
    }
    setShowQueue(true)
  }, [hasErrors, toast])

  const handleRightDisplayToggle = useCallback(() => {
    if (isToggling || hasErrors) return
    
    setIsToggling(true)
    
    // Clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current)
    }
    
    // Brief delay for smooth crossfade with cleanup
    toggleTimeoutRef.current = setTimeout(() => {
      try {
        toggleRightDisplay()
      } catch (error) {
        console.error('Error toggling display:', error)
        toast({
          title: "Display Error",
          description: "Failed to update display mode.",
          variant: "destructive"
        })
      } finally {
        setIsToggling(false)
      }
    }, 75)
  }, [isToggling, hasErrors, toggleRightDisplay, toast])

  const handleRetry = useCallback(() => {
    setIsRetrying(true)
    // Force a re-render of the live system
    window.location.reload()
  }, [])

  // Error state
  if (hasErrors && (sessionError || queueError)) {
    return (
      <div className="fixed bottom-[calc(49px+env(safe-area-inset-bottom))] left-4 right-4 z-40">
        <Alert variant="destructive" className="bg-destructive/90 backdrop-blur-sm border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">Live system error</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={isRetrying}
              className="ml-2 h-7 px-2 text-xs border-destructive-foreground/20 hover:bg-destructive-foreground/10"
              aria-label="Retry live connection"
            >
              <RotateCcw className={cn("h-3 w-3 mr-1", isRetrying && "animate-spin")} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <div 
        className={cn(
          "fixed bottom-[calc(49px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4",
          "transition-all duration-300 ease-in-out transform-gpu will-change-transform",
          isLive 
            ? "translate-y-0 opacity-100" 
            : "translate-y-full opacity-0 pointer-events-none"
        )}
        role="toolbar"
        aria-label="Live streaming controls"
      >
        <div 
          className="bg-live rounded-t-2xl shadow-2xl h-10 flex items-center contain-layout"
          style={{
            // Fallback color in case CSS custom property fails
            backgroundColor: hasErrors ? 'hsl(0 84% 60%)' : undefined
          }}
        >
          {/* Left: Queue Button (25%) */}
          <div className="flex-[0.25] flex justify-center">
            <Button
              size="sm"
              onClick={handleQueueClick}
              disabled={hasErrors}
              className="flex items-center gap-2 text-white bg-cyan-500/20 hover:bg-cyan-500/30 disabled:bg-muted/20 px-3 py-2 h-auto"
              aria-label={`Queue: ${queueCount} people waiting`}
              aria-pressed={showQueue}
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">{queueCount}</span>
            </Button>
          </div>

          {/* Center: Live Pill (50%) */}
          <div className="flex-[0.5] flex justify-center">
            <div 
              className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"
              role="status"
              aria-live="polite"
              aria-label="Currently live streaming"
            >
              <div 
                className={cn(
                  "w-2 h-2 bg-white rounded-full",
                  "animate-pulse"
                )}
                style={{
                  animationDuration: '2s',
                  animationIterationCount: 'infinite'
                }}
                aria-hidden="true"
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
              disabled={isToggling || hasErrors}
              className="flex items-center gap-1 text-white hover:bg-white/10 disabled:opacity-50 px-3 py-2 h-auto min-w-0 relative"
              aria-label={`Switch to ${rightDisplayMode === 'time' ? 'earnings' : 'time'} display`}
              title={rightDisplayMode === 'time' ? elapsedTime : earningsDisplay}
            >
              <div className={cn(
                "flex items-center gap-1 absolute inset-0 justify-center transition-opacity duration-150",
                rightDisplayMode === 'time' && !isToggling ? "opacity-100" : "opacity-0"
              )}>
                <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium text-xs truncate" aria-label={`Session time: ${elapsedTime}`}>
                  {elapsedTime}
                </span>
              </div>
              <div className={cn(
                "flex items-center gap-1 absolute inset-0 justify-center transition-opacity duration-150",
                rightDisplayMode === 'earnings' && !isToggling ? "opacity-100" : "opacity-0"
              )}>
                <DollarSign className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium text-xs truncate" aria-label={`Session earnings: ${earningsDisplay}`}>
                  {earningsDisplay}
                </span>
              </div>
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

export function LiveControlBar() {
  return (
    <LiveErrorBoundary fallback={
      <div className="fixed bottom-[calc(49px+env(safe-area-inset-bottom))] left-4 right-4 z-40">
        <Alert variant="destructive" className="bg-destructive/90 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Live controls unavailable. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    }>
      <LiveControlBarContent />
    </LiveErrorBoundary>
  )
}