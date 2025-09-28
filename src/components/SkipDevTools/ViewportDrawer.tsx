import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface ViewportDrawerProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function ViewportDrawer({ 
  trigger, 
  children 
}: ViewportDrawerProps) {
  const [snapPoints, setSnapPoints] = useState<number[]>([0.5, 0.8]);
  const firstRecordRef = useRef<HTMLDivElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateSnapPoints = () => {
      if (!drawerContentRef.current) return;

      const viewportHeight = window.innerHeight;
      const minHeightPx = 200; // Fallback minimum height
      let firstRecordHeight = minHeightPx;

      // Find the sticky first record element in the queue content
      const stickyElement = drawerContentRef.current.querySelector('[class*="sticky"]');
      if (stickyElement) {
        firstRecordHeight = Math.max(stickyElement.getBoundingClientRect().height + 120, minHeightPx);
      }

      // Convert to viewport height fractions
      const minSnapPoint = Math.min(firstRecordHeight / viewportHeight, 0.4);
      const midSnapPoint = 0.5;
      const maxSnapPoint = 0.8;

      setSnapPoints([minSnapPoint, midSnapPoint, maxSnapPoint]);
    };

    // Calculate on mount and when content changes
    calculateSnapPoints();

    // Recalculate on resize
    const handleResize = () => calculateSnapPoints();
    window.addEventListener('resize', handleResize);

    // Use MutationObserver to detect content changes
    const observer = new MutationObserver(calculateSnapPoints);
    if (drawerContentRef.current) {
      observer.observe(drawerContentRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [children]);

  return (
    <Drawer snapPoints={snapPoints} activeSnapPoint={snapPoints[1]}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="outline">View Queue</Button>
        )}
      </DrawerTrigger>
      <DrawerContent 
        ref={drawerContentRef}
        className="w-screen max-w-none rounded-t-lg border-0 border-t"
      >
        <div className="mx-auto w-full h-full flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto" ref={firstRecordRef}>
            {children || (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Development Drawer</h3>
                <p className="text-muted-foreground">
                  Dynamic drawer with smart height constraints.
                </p>
              </div>
            )}
          </div>
          
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}