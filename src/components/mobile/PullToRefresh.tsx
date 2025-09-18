import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  pullDistance?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  pullDistance = 80,
  className
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  // Check if scrolled to top
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setIsAtTop(target.scrollTop <= 5);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop || isRefreshing) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [isAtTop, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !isAtTop || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0) {
      e.preventDefault(); // Prevent scrolling when pulling down
      const pull = Math.min(deltaY * 0.5, pullDistance + 20); // Add some elasticity
      setPullY(pull);
    }
  }, [isPulling, isAtTop, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullY >= pullDistance) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullY(0);
  }, [isPulling, pullY, pullDistance, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);  
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const shouldShowIndicator = isPulling && pullY > 20;
  const shouldTrigger = pullY >= pullDistance;
  const indicatorOpacity = Math.min(pullY / pullDistance, 1);

  return (
    <div 
      ref={containerRef}
      className={cn("relative h-full overflow-y-auto", className)}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullY * 0.3, 30)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      {(shouldShowIndicator || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-4 z-50"
          style={{
            opacity: isRefreshing ? 1 : indicatorOpacity,
            transform: `translateY(-${Math.max(0, 60 - pullY)}px)`
          }}
        >
          <div className="flex items-center space-x-2 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 border shadow-sm">
            <RefreshCw 
              className={cn(
                "h-4 w-4 text-primary transition-transform duration-200",
                isRefreshing ? "animate-spin" : shouldTrigger ? "rotate-180" : ""
              )}
            />
            <span className="text-sm font-medium text-foreground">
              {isRefreshing 
                ? "Refreshing..." 
                : shouldTrigger 
                  ? "Release to refresh"
                  : "Pull to refresh"
              }
            </span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
};