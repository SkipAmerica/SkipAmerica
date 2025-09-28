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
  minPeekPx?: number; // allow override; default ~144px
}

export function ViewportDrawer({
  trigger,
  children,
  minPeekPx = 144,
}: ViewportDrawerProps) {
  const [open, setOpen] = React.useState(true);
  const [snap, setSnap] = React.useState<number | null>(minPeekPx);

  // Define snaps: [MIN, MAX]
  const snapPoints = React.useMemo(() => [minPeekPx, typeof window !== 'undefined' ? window.innerHeight : 800], [minPeekPx]);

  // Ensure content changes never auto-expand: keep `snap` controlled.
  // If someone tries to close, we bounce back to MIN (no full dismissal).
  const handleOpenChange = (next: boolean) => {
    // We never really "close" — we return to MIN peek.
    if (!next) {
      setOpen(true);
      setSnap(minPeekPx);
      return;
    }
    setOpen(true);
  };

  const handleSnapChange = (next: number | null) => {
    // Enforce lower bound — do not allow anything smaller than MIN
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
      // Two snap points: MIN peek and full height
      snapPoints={snapPoints}
      activeSnapPoint={snap}
      onSnapPointChange={handleSnapChange}
      // Keep it as a persistent bottom sheet (no modal dimming or dismissal)
      modal={false}
      dismissible={false}
      shouldScaleBackground={false}
    >
      {/* Optional: keep a trigger for parity; not strictly required */}
      <DrawerTrigger asChild>
        {trigger || <Button variant="outline">Open Queue</Button>}
      </DrawerTrigger>

      {/* Make overlay transparent since this is a persistent bottom sheet */}
      <DrawerOverlay className="bg-transparent pointer-events-none" />

      <DrawerContent
        // Let Vaul control height via snap point; prevent content from forcing size jumps
        className="w-screen max-w-none border-0"
      >
        {/* Content frame:
            - At MIN snap: hide overflow to keep only the next-in-line visible
            - As the sheet grows (user drag), more is revealed
        */}
        <div className="mx-auto w-full flex flex-col">
          {/* This wrapper is what grows/shrinks with the snap; we control scroll only when near max */}
          <PeekingContainer snap={snap} minPeekPx={minPeekPx}>
            {children}
          </PeekingContainer>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * PeekingContainer:
 *  - When at min snap, NO internal scroll (so it feels like a solid sheet).
 *  - Once expanded beyond some threshold, allow vertical scroll of the inner content.
 */
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
      {/* You can also pin a small top padding to keep the handle visible cleanly */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}