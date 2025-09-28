import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerOverlay,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface ViewportDrawerProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  minPeekPx?: number; // default ~144px
}

export function ViewportDrawer({
  trigger,
  children,
  minPeekPx = 144,
}: ViewportDrawerProps) {
  // Start CLOSED so the trigger actually opens it
  const [open, setOpen] = React.useState(false);
  const [snap, setSnap] = React.useState<number | null>(null);

  // Define snaps: [MIN, MAX]
  const snapPoints = React.useMemo(
    () => [minPeekPx, typeof window !== 'undefined' ? window.innerHeight : 800],
    [minPeekPx]
  );

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Opening => go to min peek
      setOpen(true);
      setSnap(minPeekPx);
    } else {
      // User tried to close => return to min peek instead of fully closing
      setOpen(true);
      setSnap(minPeekPx);
    }
  };

  const handleSnapChange = (next: number | null) => {
    if (next === null || next < minPeekPx) {
      setSnap(minPeekPx);
      return;
    }
    setSnap(next);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={snapPoints}
      activeSnapPoint={snap}
      onSnapPointChange={handleSnapChange}
      modal={false}
      dismissible={false}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild>
        {trigger || <Button variant="outline">Open Queue</Button>}
      </DrawerTrigger>

      {/* Transparent overlay so it feels persistent */}
      <DrawerOverlay className="bg-transparent pointer-events-none" />

      <DrawerContent className="w-screen max-w-none border-0">
        <div className="mx-auto w-full flex flex-col">
          <PeekingContainer snap={snap} minPeekPx={minPeekPx}>
            {children}
          </PeekingContainer>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PeekingContainer({
  children,
  snap,
  minPeekPx,
}: {
  children: React.ReactNode;
  snap: number | null;
  minPeekPx: number;
}) {
  const allowScroll = (snap ?? minPeekPx) > minPeekPx + 32;
  return (
    <div className={allowScroll ? "flex-1 overflow-y-auto" : "flex-1 overflow-hidden"}>
      <div className="pt-2">{children}</div>
    </div>
  );
}