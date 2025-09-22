import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLive } from '@/hooks/live';
import { QueueDrawer } from './QueueDrawer';
import { LiveErrorBoundary } from './LiveErrorBoundary';

const LiveControlBarContent: React.FC = () => {
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [animatingToggle, setAnimatingToggle] = useState(false);

  // Always call all hooks unconditionally at the top level
  const { 
    isLive, 
    isDiscoverable,
    state, 
    queueCount, 
    elapsedTime, 
    earningsDisplay, 
    rightDisplayMode, 
    toggleRightDisplay 
  } = useLive();

  const handleQueueClick = useCallback(() => {
    if (queueCount > 0) {
      setShowQueueDrawer(true);
    }
  }, [queueCount]);

  const handleRightDisplayToggle = useCallback(() => {
    if (animatingToggle) return;
    
    setAnimatingToggle(true);
    setTimeout(() => setAnimatingToggle(false), 300);
    
    toggleRightDisplay();
  }, [animatingToggle, toggleRightDisplay]);

  // Add body class for live state
  useEffect(() => {
    if (state === 'SESSION_ACTIVE') {
      document.body.classList.add('live-active');
    } else {
      document.body.classList.remove('live-active');
    }
    
    return () => {
      document.body.classList.remove('live-active');
    };
  }, [state])
  
  // Show LSB when discoverable but not in active call
  const shouldShowLSB = isDiscoverable && !isLive
  
  return (
    <>
      {/* LSB Shell - Always mounted for animation */}
      <div className="lsb-shell">
        <div 
          className={cn(
            "lsb-inner",
            shouldShowLSB && "lsb-inner--visible"
          )}
          role="toolbar"
          aria-label="Live session controls"
        >
          {/* Left - Queue button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQueueClick}
            disabled={queueCount === 0}
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-auto",
              "disabled:opacity-50"
            )}
          >
            <Users size={16} />
            <span className="text-sm font-medium">{queueCount}</span>
          </Button>

          {/* Center - Live Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-cyan-600">Discoverable</span>
          </div>

          {/* Right - Time/Earnings Display */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRightDisplayToggle}
            disabled={animatingToggle}
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-auto min-w-0",
              "transition-all duration-200",
              animatingToggle && "scale-95"
            )}
          >
            {rightDisplayMode === 'earnings' ? (
              <>
                <DollarSign size={16} />
                <span className="text-sm font-medium tabular-nums">
                  {earningsDisplay}
                </span>
              </>
            ) : (
              <>
                <Clock size={16} />
                <span className="text-sm font-medium tabular-nums">
                  {elapsedTime}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      <QueueDrawer isOpen={showQueueDrawer} onClose={() => setShowQueueDrawer(false)} />
    </>
  )
}

export const LiveControlBar: React.FC = () => (
  <LiveErrorBoundary>
    <LiveControlBarContent />
  </LiveErrorBoundary>
)