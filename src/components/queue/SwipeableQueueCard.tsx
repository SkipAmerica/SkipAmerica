import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type SwipeableQueueCardProps = {
  nextUpPanel: React.ReactNode;
  broadcastPanel: React.ReactNode;
  className?: string;
  onBroadcastClose?: () => void;
};

export function SwipeableQueueCard({
  nextUpPanel,
  broadcastPanel,
  className,
  onBroadcastClose,
}: SwipeableQueueCardProps) {
  // Handle close from broadcast panel
  const handleBroadcastClose = () => {
    setCurrentPanel(0); // Switch back to Panel 1
    onBroadcastClose?.();
  };
  const [currentPanel, setCurrentPanel] = useState<0 | 1>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(0);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    startTimeRef.current = Date.now();
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const currentOffset = -currentPanel * containerWidth;
    const newOffset = currentOffset + deltaX;
    
    // Constrain dragging within bounds
    const minOffset = -containerWidth;
    const maxOffset = 0;
    const constrainedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
    
    // Store the DELTA from current position, not absolute position
    setDragOffset(constrainedOffset - currentOffset);
  };

  const handleEnd = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = Math.abs(deltaX) / deltaTime;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    
    // Determine if we should switch panels
    const threshold = containerWidth * 0.3;
    const shouldSwitch = Math.abs(deltaX) > threshold || velocity > 0.5;
    
    if (shouldSwitch) {
      if (deltaX < 0 && currentPanel === 0) {
        setCurrentPanel(1);
      } else if (deltaX > 0 && currentPanel === 1) {
        setCurrentPanel(0);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
    setStartX(0);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if click target is an interactive element
    const target = e.target as HTMLElement;
    const isInteractive = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.isContentEditable ||
      target.closest('input, textarea, button, a, [contenteditable="true"]') ||
      target.closest('[data-no-drag]');
    
    if (isInteractive) {
      return; // Don't start dragging
    }
    
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = (e: MouseEvent) => {
    handleEnd(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if touch target is an interactive element
    const target = e.target as HTMLElement;
    const isInteractive = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.isContentEditable ||
      target.closest('input, textarea, button, a, [contenteditable="true"]') ||
      target.closest('[data-no-drag]');
    
    if (isInteractive) {
      return; // Don't start dragging
    }
    
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    handleEnd(touch.clientX);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && currentPanel === 1) {
      setCurrentPanel(0);
    } else if (e.key === "ArrowRight" && currentPanel === 0) {
      setCurrentPanel(1);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, startX, currentPanel]);

  const getTransform = () => {
    if (isDragging && dragOffset !== 0) {
      const baseOffset = -currentPanel * 50;
      const containerWidth = containerRef.current?.offsetWidth || 0;
      const deltaPercent = containerWidth > 0 ? (dragOffset / containerWidth) * 50 : 0;
      return `translateX(${baseOffset + deltaPercent}%)`;
    }
    return `translateX(-${currentPanel * 50}%)`;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden cursor-grab active:cursor-grabbing p-0 m-0", className)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Swipeable queue card"
    >
      <div
        className={cn(
          "flex w-[200%] gap-0",
          !isDragging && "transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        )}
        style={{ transform: getTransform(), willChange: 'transform' }}
      >
        {/* Panel 1: Next Up (3 rows: video, chat, queue) */}
        <div className="w-1/2 flex-shrink-0 min-h-[600px] overflow-y-auto">
          {nextUpPanel}
        </div>

        {/* Panel 2: Broadcast (1 row: video only) */}
        <div className="w-1/2 flex-shrink-0 min-h-[600px]">
          {React.isValidElement(broadcastPanel)
            ? React.cloneElement(broadcastPanel as React.ReactElement<any>, {
                onClose: handleBroadcastClose
              })
            : broadcastPanel}
        </div>
      </div>

      {/* Swipe Indicator Dots - only show on Panel 1 */}
      {currentPanel === 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-primary w-4" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      )}
    </div>
  );
}
