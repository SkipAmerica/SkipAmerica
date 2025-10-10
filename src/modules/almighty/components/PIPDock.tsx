import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface PIPDockProps {
  children: React.ReactNode;               // your <PIP ... /> goes here
  initialCorner?: Corner;                  // default: 'bottom-right'
  shelved?: boolean;                       // default: false
  onShelvedChange?: (val: boolean) => void;
  className?: string;                      // optional extra classes on the frame
}

/**
 * Purely presentational wrapper for a PIP tile:
 * - Bigger (FaceTime-ish) fixed size with 16:9 aspect
 * - Draggable; snaps to nearest corner on release
 * - Shelve/unshelve with a corner-aware pull tab
 * - Safe-area aware; high z-index; smooth animations
 *
 * No media/LiveKit logic here — render-only.
 */
export default function PIPDock({
  children,
  initialCorner = 'bottom-right',
  shelved: shelvedProp,
  onShelvedChange,
  className,
}: PIPDockProps) {
  // track current corner + shelved state
  const [corner, setCorner] = useState<Corner>(initialCorner);
  const [shelvedInternal, setShelvedInternal] = useState<boolean>(!!shelvedProp);
  const shelved = shelvedProp ?? shelvedInternal;

  useEffect(() => {
    if (typeof shelvedProp === 'boolean') setShelvedInternal(shelvedProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelvedProp]);

  // PIP size — FaceTime-ish (responsive, fixed 16:9)
  // ~ 288–352 px width depending on viewport, maintains 16:9
  const width = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const clamped = Math.max(280, Math.min(360, Math.round(vw * 0.28)));
    return clamped; // px
  }, []);

  const height = Math.round(width * 9 / 16);

  // dragging state
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  // safe-area insets (fallback to 12px if env() not supported)
  const safe = useMemo(() => ({
    top:  Math.max(12, parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-top')) || 0),
    right:Math.max(12, parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-right')) || 0),
    bottom:Math.max(12, parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-bottom')) || 0),
    left: Math.max(12, parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-left')) || 0),
  }), []);

  // compute snapped corner from current center point
  const snapToNearestCorner = (left: number, top: number) => {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const rightSide = cx > ww / 2;
    const bottomSide = cy > wh / 2;
    const c: Corner =
      bottomSide ? (rightSide ? 'bottom-right' : 'bottom-left')
                 : (rightSide ? 'top-right' : 'top-left');
    return c;
  };

  // place frame at a corner with optional shelf translate
  const applyCornerPosition = (c: Corner, shelve: boolean) => {
    const el = frameRef.current;
    if (!el) return;

    const pad = 12; // gap from edge
    const x = c.includes('right')
      ? window.innerWidth - width - pad - (c.includes('right') ? safe.right : safe.left)
      : pad + (c.includes('left') ? safe.left : safe.right);
    const y = c.includes('bottom')
      ? window.innerHeight - height - pad - (c.includes('bottom') ? safe.bottom : safe.top)
      : pad + (c.includes('top') ? safe.top : safe.bottom);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // shelf offset (push mostly off-screen while leaving a tab showing)
    const shelfOffset = Math.round(width * 0.70); // how far to tuck
    const shelfY = Math.round(height * 0.35);

    let tx = 0, ty = 0;
    if (shelve) {
      if (c.includes('left'))  tx = -(shelfOffset);
      if (c.includes('right')) tx =  (shelfOffset);
      if (c.includes('top'))   ty = -(shelfY);
      if (c.includes('bottom'))ty =  (shelfY);
    }

    el.style.transform = `translate(${tx}px, ${ty}px)`;
  };

  // initial mount + on resize
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    applyCornerPosition(corner, shelved);

    const onResize = () => applyCornerPosition(corner, shelved);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, corner, shelved]);

  // drag handlers
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const el = frameRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: el.offsetLeft,
      originTop: el.offsetTop,
    };
    // unshelve on drag
    if (shelved) setShelved(false);
  };

  const setShelved = (val: boolean) => {
    setShelvedInternal(val);
    onShelvedChange?.(val);
    // re-apply to position
    applyCornerPosition(corner, val);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current?.active || !frameRef.current) return;
    const { startX, startY, originLeft, originTop } = dragRef.current;
    const nx = originLeft + (e.clientX - startX);
    const ny = originTop + (e.clientY - startY);
    frameRef.current.style.left = `${nx}px`;
    frameRef.current.style.top = `${ny}px`;
    frameRef.current.style.transform = `translate(0,0)`; // disable shelf during drag
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const el = frameRef.current;
    if (!dragRef.current || !el) return;
    el.releasePointerCapture(e.pointerId);
    dragRef.current.active = false;

    const nextCorner = snapToNearestCorner(el.offsetLeft, el.offsetTop);
    setCorner(nextCorner);
    // snap + small animation
    el.style.transition = 'transform 160ms ease, left 160ms ease, top 160ms ease';
    requestAnimationFrame(() => {
      applyCornerPosition(nextCorner, false);
      setTimeout(() => {
        if (el) el.style.transition = ''; // clear
      }, 180);
    });
  };

  // pull-tab position per-corner
  const tabPos = (() => {
    const base =
      'absolute w-10 h-7 rounded-md bg-white/90 text-black shadow ' +
      'flex items-center justify-center cursor-pointer select-none';
    switch (corner) {
      case 'top-left': return `${base} -left-2 top-1/2 -translate-y-1/2`;
      case 'top-right': return `${base} -right-2 top-1/2 -translate-y-1/2`;
      case 'bottom-left': return `${base} -left-2 top-1/2 -translate-y-1/2`;
      case 'bottom-right': return `${base} -right-2 top-1/2 -translate-y-1/2`;
    }
  })();

  return (
    <div
      ref={frameRef}
      role="group"
      aria-label="Picture-in-picture"
      className={cn(
        'fixed z-[2147483000] rounded-xl overflow-hidden bg-black/80 backdrop-blur-sm',
        'touch-none', // prevent pull-to-refresh during drag
        className
      )}
      style={{
        // positioned via JS; size set on mount
        willChange: 'left, top, transform',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* content */}
      <div className="w-full h-full">{children}</div>

      {/* shelf tab */}
      <button
        type="button"
        aria-label={shelved ? 'Unshelve video' : 'Shelve video'}
        onClick={(e) => {
          e.stopPropagation();
          setShelved(!shelved);
        }}
        className={tabPos}
        style={{ opacity: 0.95 }}
      >
        {shelved ? '⟨' : '⟩'}
      </button>
    </div>
  );
}
