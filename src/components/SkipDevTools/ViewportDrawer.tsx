import React from 'react';
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
  return (
    <Drawer snapPoints={["50vh", "80vh"]} fadeFromIndex={0}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="outline">View Queue</Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="w-screen max-w-none rounded-t-lg border-0 border-t">
        <div className="mx-auto w-full h-full flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {children || (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Development Drawer</h3>
                <p className="text-muted-foreground">
                  This drawer covers exactly 50% of the viewport height and 100% of the viewport width.
                  Perfect for development work and testing.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    Dimensions: 100vw × 50vh
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