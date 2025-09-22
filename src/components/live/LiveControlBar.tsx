import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLive } from '@/hooks/live';
import { QueueDrawer } from './QueueDrawer';
import { QueueDrawerContent } from './QueueDrawerContent';
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const startDragY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const live = useLive();
  
  // Safely access live store values
  const isLive = live?.isLive || false;
  const isDiscoverable = live?.isDiscoverable || false;
  const state = live?.state || 'OFFLINE';
  const queueCount = live?.queueCount || 0;
  
  // Compute discoverable posture using same predicate as store
  const isInDiscoverablePosture = state === 'DISCOVERABLE' || state === 'SESSION_PREP' || state === 'SESSION_JOINING';

  const handleQueueClick = useCallback(() => {
    if (queueCount > 0) {
      setIsQueueOpen(!isQueueOpen);
    }
  }, [queueCount, isQueueOpen]);

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

  // Hydration effect - prevent flash
  useEffect(() => {
    setIsHydrated(true);
    const el = document.getElementById("dsb-root");
    if (el) {
      el.setAttribute("data-hydrated", "true");
      el.classList.remove("dsb-prehydrate");
    }
  }, []);

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

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!panelRef.current) return;
    
    setIsDragging(true);
    startDragY.current = e.clientY;
    panelRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const deltaY = startDragY.current - e.clientY; // Positive when dragging up
    setDragY(Math.max(0, deltaY)); // Only allow upward drag
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = 50; // pixels
    
    if (dragY > threshold) {
      setIsQueueOpen(true);
    } else {
      setIsQueueOpen(false);
    }
    
    setDragY(0);
    panelRef.current?.releasePointerCapture(e.pointerId);
  }, [isDragging, dragY]);
  
  // Show LSB when discoverable but not in active call
  const shouldShowLSB = isDiscoverable && !isLive;

  // Publish CSS variables for FAB positioning
  useEffect(() => {
    const shell = shellRef.current;
    const isLSBVisible = shouldShowLSB;
    
    // Set visibility variable - use discoverable posture for immediate response
    document.documentElement.style.setProperty('--lsb-visible', (isLSBVisible && isInDiscoverablePosture) ? '1' : '0');
    
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

  // Real-time timer updates - only when in discoverable posture
  useEffect(() => {
    // Cancel any existing RAF loop
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Start RAF loop only when in discoverable posture
    if (!isInDiscoverablePosture) return;
    
    const animate = () => {
      setCurrentTime(Date.now());
      // Only continue if still in discoverable posture
      if (isInDiscoverablePosture) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };
    
    rafIdRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isInDiscoverablePosture]);

  // Calculate real-time elapsed time for current session
  const sessionStartedAt = live?.sessionStartedAt || null;
  const sessionElapsed = live?.sessionElapsed || 0;
  
  const realTimeElapsed = useMemo(() => {
    if (isInDiscoverablePosture && sessionStartedAt) {
      const totalMs = sessionElapsed + (currentTime - sessionStartedAt);
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (sessionElapsed > 0) {
      const minutes = Math.floor(sessionElapsed / 60000);
      const seconds = Math.floor((sessionElapsed % 60000) / 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return '00:00';
  }, [isInDiscoverablePosture, sessionStartedAt, sessionElapsed, currentTime]);

  // Calculate counter display based on mode
  const { counterText, counterSubtext, counterIcon } = useMemo(() => {
    const sessionCalls = live?.sessionCalls || 0;
    const sessionEarnings = live?.sessionEarningsCents || 0;
    const todayCalls = live?.todayCalls || 0;
    const todayEarnings = live?.todayEarningsCents || 0;

    switch (counterMode) {
      case 'SESSION_EARNINGS':
        return {
          counterText: `$${(sessionEarnings / 100).toFixed(2)}`,
          counterSubtext: `${sessionCalls} call${sessionCalls !== 1 ? 's' : ''}`,
          counterIcon: 'DollarSign'
        };
      case 'TODAY_EARNINGS':
        return {
          counterText: `$${(todayEarnings / 100).toFixed(2)}`,
          counterSubtext: `${todayCalls} call${todayCalls !== 1 ? 's' : ''} today`,
          counterIcon: 'DollarSign'
        };
      case 'SESSION_DURATION':
        return {
          counterText: realTimeElapsed,
          counterSubtext: 'this session',
          counterIcon: 'Clock'
        };
      default:
        return {
          counterText: `$${(sessionEarnings / 100).toFixed(2)}`,
          counterSubtext: `${sessionCalls} call${sessionCalls !== 1 ? 's' : ''}`,
          counterIcon: 'DollarSign'
        };
    }
  }, [counterMode, live?.sessionCalls, live?.sessionEarningsCents, live?.todayCalls, live?.todayEarningsCents, realTimeElapsed]);
  
  return (
    <>
      {/* DSB Shell - Always mounted for animation */}
      <div 
        id="dsb-root"
        ref={shellRef} 
        className={cn(
          "lsb-shell",
          "dsb-prehydrate",
          isHydrated && "lsb-shell--hydrated"
        )}
        data-hydrated="false"
      >
        <div 
          ref={panelRef}
          className={cn(
            "lsb-inner",
            (isVisible && shouldShowLSB) && "lsb-inner--visible"
          )}
          role="toolbar"
          aria-label="Live session controls"
          aria-controls="queue-drawer"
          aria-expanded={isQueueOpen}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            transform: isDragging ? `translateY(${-dragY}px)` : undefined
          }}
        >
          {/* Left - Queue button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQueueClick}
            disabled={queueCount === 0}
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-auto text-white justify-self-start",
              "disabled:opacity-50"
            )}
          >
            <Users size={16} />
            <span className="text-sm font-medium">{queueCount}</span>
          </Button>

          {/* Center - Live Status */}
          <div className="flex items-center gap-2 justify-self-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-bold text-white uppercase">DISCOVERABLE</span>
          </div>

          {/* Right - Counter Display */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCounterClick}
            disabled={animatingToggle}
            className={cn(
              "flex flex-col items-center gap-0 px-3 py-1 h-auto min-w-0 text-white justify-self-end",
              "transition-all duration-200",
              animatingToggle && "scale-95"
            )}
          >
            <div className="flex items-center gap-1">
              {counterIcon === 'Clock' ? <Clock size={14} /> : <DollarSign size={14} />}
              <span className="text-xs font-bold tabular-nums">
                {counterText}
              </span>
            </div>
            <span className="text-xs opacity-90">
              {counterSubtext}
            </span>
          </Button>
        </div>
        
        {/* Queue Drawer */}
        <div 
          id="queue-drawer"
          className={cn(
            "queue-drawer",
            isQueueOpen && "queue-drawer--open"
          )}
          role="dialog"
          aria-expanded={isQueueOpen}
          aria-label="Queue drawer"
        >
          <div className="queue-drawer__content">
            <QueueDrawerContent queueCount={queueCount} />
          </div>
        </div>
      </div>
    </>
  )
}

export const LiveControlBar: React.FC = () => (
  <LiveErrorBoundary>
    <LiveControlBarContent />
  </LiveErrorBoundary>
)