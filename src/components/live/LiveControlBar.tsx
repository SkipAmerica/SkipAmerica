import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLive } from '@/hooks/live';
import { QueueDrawer } from './QueueDrawer';
import { LiveErrorBoundary } from './LiveErrorBoundary';

type CounterMode = 'SESSION_EARNINGS' | 'TODAY_EARNINGS' | 'SESSION_DURATION'

const LiveControlBarContent: React.FC = () => {
  // Always call all hooks unconditionally at the top level
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [animatingToggle, setAnimatingToggle] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [counterMode, setCounterMode] = useState<CounterMode>(() => {
    return (localStorage.getItem('lsb-counter-mode') as CounterMode) || 'SESSION_EARNINGS'
  });
  const shellRef = useRef<HTMLDivElement>(null);

  const live = useLive();
  
  // Safely access live store values
  const isLive = live?.isLive || false;
  const isDiscoverable = live?.isDiscoverable || false;
  const state = live?.state || 'OFFLINE';
  const queueCount = live?.queueCount || 0;

  const handleQueueClick = useCallback(() => {
    if (queueCount > 0) {
      setShowQueueDrawer(true);
    }
  }, [queueCount]);

  const handleCounterClick = useCallback(() => {
    if (animatingToggle) return;
    
    setAnimatingToggle(true);
    setTimeout(() => setAnimatingToggle(false), 300);
    
    // Cycle through modes: SESSION_EARNINGS -> TODAY_EARNINGS -> SESSION_DURATION -> repeat
    const nextMode = counterMode === 'SESSION_EARNINGS' ? 'TODAY_EARNINGS' :
                     counterMode === 'TODAY_EARNINGS' ? 'SESSION_DURATION' : 'SESSION_EARNINGS';
    
    setCounterMode(nextMode);
    localStorage.setItem('lsb-counter-mode', nextMode);
  }, [animatingToggle, counterMode]);

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
  const shouldShowLSB = isDiscoverable && !isLive;

  // Publish CSS variables for FAB positioning
  useEffect(() => {
    const shell = shellRef.current;
    const isLSBVisible = shouldShowLSB;
    
    // Set visibility variable
    document.documentElement.style.setProperty('--lsb-visible', isLSBVisible ? '1' : '0');
    
    // Set height variable
    if (shell && shell.offsetHeight > 0) {
      document.documentElement.style.setProperty('--lsb-height', `${shell.offsetHeight}px`);
    }
  }, [shouldShowLSB]);

  // ResizeObserver to keep --lsb-height current
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === shell && entry.contentRect.height > 0) {
          document.documentElement.style.setProperty('--lsb-height', `${entry.contentRect.height}px`);
        }
      }
    });
    
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  // Handle animation states for show/hide
  useEffect(() => {
    if (shouldShowLSB && !isVisible) {
      // Show: immediately set visible and start animation
      setIsVisible(true);
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 220);
      return () => clearTimeout(timer);
    } else if (!shouldShowLSB && isVisible) {
      // Hide: start animation, then hide after completion
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [shouldShowLSB, isVisible]);

  // Real-time timer updates
  useEffect(() => {
    if (!isDiscoverable) return;
    
    const animate = () => {
      setCurrentTime(Date.now());
      if (isDiscoverable) {
        requestAnimationFrame(animate);
      }
    };
    
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isDiscoverable]);

  // Calculate real-time elapsed time
  const discoverableStartedAt = live?.discoverableStartedAt || null;
  const accumulatedTime = live?.accumulatedDiscoverableTime || 0;
  
  const realTimeElapsed = useMemo(() => {
    if (isDiscoverable && discoverableStartedAt) {
      const totalMs = accumulatedTime + (currentTime - discoverableStartedAt);
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (accumulatedTime > 0) {
      const minutes = Math.floor(accumulatedTime / 60000);
      const seconds = Math.floor((accumulatedTime % 60000) / 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return '00:00';
  }, [isDiscoverable, discoverableStartedAt, accumulatedTime, currentTime]);

  // Calculate counter display based on mode
  const { counterText, counterSubtext, counterIcon } = useMemo(() => {
    const sessionCalls = live?.callsTaken || 0;
    const sessionEarnings = live?.totalEarningsCents || 0;
    const todayCalls = live?.todayCalls || 0;
    const todayEarnings = live?.todayEarningsCents || 0;

    switch (counterMode) {
      case 'SESSION_EARNINGS':
        return {
          counterText: `$${(sessionEarnings / 100).toFixed(2)}`,
          counterSubtext: `${sessionCalls} call${sessionCalls !== 1 ? 's' : ''}`,
          counterIcon: DollarSign
        };
      case 'TODAY_EARNINGS':
        return {
          counterText: `$${(todayEarnings / 100).toFixed(2)}`,
          counterSubtext: `${todayCalls} call${todayCalls !== 1 ? 's' : ''} today`,
          counterIcon: DollarSign
        };
      case 'SESSION_DURATION':
        return {
          counterText: realTimeElapsed,
          counterSubtext: 'this session',
          counterIcon: Clock
        };
      default:
        return {
          counterText: `$${(sessionEarnings / 100).toFixed(2)}`,
          counterSubtext: `${sessionCalls} call${sessionCalls !== 1 ? 's' : ''}`,
          counterIcon: DollarSign
        };
    }
  }, [counterMode, live?.callsTaken, live?.totalEarningsCents, live?.todayCalls, live?.todayEarningsCents, realTimeElapsed]);
  
  return (
    <>
      {/* LSB Shell - Always mounted for animation */}
      <div ref={shellRef} className="lsb-shell">
        <div 
          className={cn(
            "lsb-inner",
            (isVisible && shouldShowLSB) && "lsb-inner--visible"
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
              "flex items-center gap-2 px-3 py-2 h-auto text-white",
              "disabled:opacity-50"
            )}
          >
            <Users size={16} />
            <span className="text-sm font-medium">{queueCount}</span>
          </Button>

          {/* Center - Live Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">Discoverable</span>
          </div>

          {/* Right - Counter Display */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCounterClick}
            disabled={animatingToggle}
            className={cn(
              "flex flex-col items-center gap-0 px-3 py-1 h-auto min-w-0 text-white",
              "transition-all duration-200",
              animatingToggle && "scale-95"
            )}
          >
            <div className="flex items-center gap-1">
              {React.createElement(counterIcon, { size: 14 })}
              <span className="text-xs font-bold tabular-nums">
                {counterText}
              </span>
            </div>
            <span className="text-xs opacity-90">
              {counterSubtext}
            </span>
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