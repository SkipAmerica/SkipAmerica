import React, { useLayoutEffect, useRef, useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!drawerRef.current || !contentRef.current) return;

    // Allow a brief moment for content to render and height to stabilize
    const timer = setTimeout(() => {
      const drawerElement = drawerRef.current;
      const contentElement = contentRef.current;
      
      if (!drawerElement || !contentElement) return;

      // Measure the actual content height
      const contentHeight = contentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      // Calculate how much to hide (all but drag handle + first record ~144px)
      const visibleHeight = 144;
      const hideAmount = Math.max(0, contentHeight - visibleHeight);
      
      if (hideAmount > 0 && isCollapsed) {
        // Apply transform to hide most of the drawer
        drawerElement.style.transform = `translateY(${hideAmount}px)`;
        drawerElement.style.transition = 'transform 0.3s ease-out';
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [children, isCollapsed]);

  return (
    <Drawer onOpenChange={(open) => {
      if (open) {
        setIsCollapsed(true);
      }
    }}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="outline">View Queue</Button>
        )}
      </DrawerTrigger>
      <DrawerContent 
        ref={drawerRef}
        className="w-screen max-h-screen max-w-none rounded-t-lg border-0 border-t"
        onInteractOutside={() => setIsCollapsed(false)}
        onPointerDownOutside={() => setIsCollapsed(false)}
      >
        <div ref={contentRef} className="mx-auto w-full h-full flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {children || (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Development Drawer</h3>
                <p className="text-muted-foreground">
                  This drawer is draggable from its natural height up to 100% of the viewport height.
                  Perfect for development work and testing.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    Dimensions: 100vw × auto (draggable to 100vh)
                  </p>
                </div>
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