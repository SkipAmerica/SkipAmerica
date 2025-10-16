import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface PIPDockProps {
  children: React.ReactNode;
  initialCorner?: Corner;
  boundsRef?: React.RefObject<HTMLElement>;
  avoidRef?: React.RefObject<HTMLElement>;
  shelved?: boolean;
  onShelvedChange?: (val: boolean) => void;
  className?: string;
}

/**
 * Draggable PIP dock bound to a parent container (CenterPane).
 * - Smooth dragging with RAF throttling and transform3d
 * - Snaps to nearest corner on release
 * - Shelving hides body outside bounds, shows only handle
 * - Clamped to parent rect with padding
 */
export default function PIPDock({
  children,
  initialCorner = 'bottom-right',
  boundsRef,
  avoidRef,
  shelved: shelvedProp,
  onShelvedChange,
  className,
}: PIPDockProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    x: 0,
    y: 0,
    w: 320,
    h: 180,
    corner: initialCorner,
    shelved: !!shelvedProp,
    dragging: false,
  });
  const rafRef = useRef<number | null>(null);
  const padding = 12;

  // Sync external shelved prop
  useEffect(() => {
    if (typeof shelvedProp === 'boolean') {
      stateRef.current.shelved = shelvedProp;
      apply();
    }
  }, [shelvedProp]);

  // Get bounding rect of parent or fallback to viewport
  const getRect = () => {
    if (boundsRef?.current) {
      const rect = boundsRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  };

  // Clamp position to bounds
  const clampToRect = (x: number, y: number) => {
    const r = getRect();
    const { w, h } = stateRef.current;
    return {
      x: Math.max(padding, Math.min(x, r.width - w - padding)),
      y: Math.max(padding, Math.min(y, r.height - h - padding)),
    };
  };

  // Get avoid box in stage coordinates
  const getAvoidBox = () => {
    const avoid = avoidRef?.current?.getBoundingClientRect();
    const bounds = boundsRef?.current?.getBoundingClientRect();
    if (!avoid || !bounds) return null;
    
    return {
      x: avoid.left - bounds.left,
      y: avoid.top - bounds.top,
      w: avoid.width,
      h: avoid.height,
    };
  };

  // Check rect overlap
  const overlap = (
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  // Resolve overlap by minimal nudge (prefer vertical)
  const resolveAvoid = (x: number, y: number) => {
    const avoid = getAvoidBox();
    const { w, h } = stateRef.current;
    if (!avoid) return { x, y };
    
    // No overlap? Return as-is
    if (!overlap(x, y, w, h, avoid.x, avoid.y, avoid.w, avoid.h)) {
      return { x, y };
    }
    
    // Calculate nudge distances in each direction
    const toTop = y + h - avoid.y + padding;
    const toBottom = avoid.y + avoid.h - y + padding;
    const toLeft = x + w - avoid.x + padding;
    const toRight = avoid.x + avoid.w - x + padding;
    
    // Pick smallest nudge (prefer vertical)
    const candidates = [
      { dx: 0, dy: -toTop, dist: toTop },
      { dx: 0, dy: toBottom, dist: toBottom },
      { dx: -toLeft, dy: 0, dist: toLeft },
      { dx: toRight, dy: 0, dist: toRight },
    ].filter(c => c.dist > 0).sort((a, b) => a.dist - b.dist);
    
    if (!candidates.length) return { x, y };
    
    const best = candidates[0];
    return clampToRect(x + best.dx, y + best.dy);
  };

  // Apply transform with optional shelf offset
  const apply = () => {
    const el = frameRef.current;
    if (!el) return;

    const { x, y, shelved, corner } = stateRef.current;
    const clamped = clampToRect(x, y);
    const cleared = resolveAvoid(clamped.x, clamped.y);

    let tx = cleared.x;
    let ty = cleared.y;

    // Shelf offset: keep 26px handle visible
    if (shelved) {
      const handleSize = 26;
      if (corner.includes('left')) tx = -(stateRef.current.w - handleSize);
      if (corner.includes('right')) tx = cleared.x + (stateRef.current.w - handleSize);
      if (corner.includes('top')) ty = -(stateRef.current.h - handleSize);
      if (corner.includes('bottom')) ty = cleared.y + (stateRef.current.h - handleSize);
    }

    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  };

  // Place at specific corner
  const placeAtCorner = (c: Corner) => {
    const r = getRect();
    const { w, h } = stateRef.current;

    const positions: Record<Corner, { x: number; y: number }> = {
      'top-left': { x: padding, y: padding },
      'top-right': { x: r.width - w - padding, y: padding },
      'bottom-left': { x: padding, y: r.height - h - padding },
      'bottom-right': { x: r.width - w - padding, y: r.height - h - padding },
    };

    const pos = positions[c];
    stateRef.current.x = pos.x;
    stateRef.current.y = pos.y;
    stateRef.current.corner = c;
    apply();
  };

  // Toggle shelf with animation
  const toggleShelve = () => {
    const newShelved = !stateRef.current.shelved;
    stateRef.current.shelved = newShelved;
    onShelvedChange?.(newShelved);

    const el = frameRef.current;
    if (el) {
      el.style.transition = 'transform 200ms ease-out';
    }

    apply();

    setTimeout(() => {
      if (el) el.style.transition = '';
    }, 220);
  };

  // Drag handlers with RAF throttling
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    // Ignore if clicking shelf button
    if ((e.target as HTMLElement).closest('button')) return;

    const el = frameRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startStateX = stateRef.current.x;
    const startStateY = stateRef.current.y;

    // Unshelve immediately
    if (stateRef.current.shelved) {
      stateRef.current.shelved = false;
      onShelvedChange?.(false);
    }

    stateRef.current.dragging = true;

    const handleMove = (ev: PointerEvent) => {
      if (!stateRef.current.dragging) return;

      // Cancel any pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // Schedule new frame
      rafRef.current = requestAnimationFrame(() => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        stateRef.current.x = startStateX + dx;
        stateRef.current.y = startStateY + dy;
        apply();
        rafRef.current = null;
      });
    };

    const handleUp = () => {
      stateRef.current.dragging = false;
      window.removeEventListener('pointermove', handleMove, true);
      window.removeEventListener('pointerup', handleUp, true);

      // Cancel any pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Snap to nearest corner
      const r = getRect();
      const { x, y, w, h } = stateRef.current;
      const clamped = clampToRect(x, y);

      const corners: Array<[Corner, number, number]> = [
        ['top-left', padding, padding],
        ['top-right', r.width - w - padding, padding],
        ['bottom-left', padding, r.height - h - padding],
        ['bottom-right', r.width - w - padding, r.height - h - padding],
      ];

      // Find nearest corner by distance
      let minDist = Infinity;
      let nearest: Corner = 'bottom-right';

      corners.forEach(([corner, cx, cy]) => {
        const dist = Math.hypot(clamped.x - cx, clamped.y - cy);
        if (dist < minDist) {
          minDist = dist;
          nearest = corner;
        }
      });

      // Animate snap
      if (el) {
        el.style.transition = 'transform 160ms ease-out';
      }

      placeAtCorner(nearest);
      apply(); // Re-apply to trigger collision detection after snap

      setTimeout(() => {
        if (el) el.style.transition = '';
      }, 180);
    };

    window.addEventListener('pointermove', handleMove, true);
    window.addEventListener('pointerup', handleUp, true);
  };

  // Size calculation with ResizeObserver
  useEffect(() => {
    const setSizeAndCorner = () => {
      const r = getRect();
      stateRef.current.w = 138;  // 162 * 0.85 = 138px
      stateRef.current.h = 196;  // 230 * 0.85 = 196px

      const el = frameRef.current;
      if (el) {
        el.style.width = `${stateRef.current.w}px`;
        el.style.height = `${stateRef.current.h}px`;
      }

      placeAtCorner(stateRef.current.corner);
    };

    setSizeAndCorner();

    const ro = new ResizeObserver(setSizeAndCorner);
    const target = boundsRef?.current ?? document.body;
    ro.observe(target);

    return () => ro.disconnect();
  }, [boundsRef, initialCorner]);

  return (
    <div
      ref={frameRef}
      role="group"
      aria-label="Picture-in-picture"
      className={cn(
        'absolute top-0 left-0 z-20 rounded-xl overflow-hidden bg-black/80 backdrop-blur-sm',
        className
      )}
    style={{
      touchAction: 'none',
      willChange: 'transform',
    }}
      onPointerDown={onPointerDown}
    >
      {/* body */}
      <div 
        className="w-full h-full"
        style={{ pointerEvents: stateRef.current.shelved ? 'none' : 'auto' }}
      >
        {children}
      </div>

      {/* shelf handle - always clickable */}
      <button
        type="button"
        aria-label={stateRef.current.shelved ? 'Unshelve video' : 'Shelve video'}
        onClick={(e) => {
          e.stopPropagation();
          toggleShelve();
        }}
        className={cn(
          'absolute w-7 h-7 rounded-md bg-white/90 text-black shadow-lg',
          'flex items-center justify-center cursor-pointer select-none',
          'transition-opacity duration-200',
          'top-1/2 -translate-y-1/2',
          stateRef.current.corner.includes('left') && '-left-1',
          stateRef.current.corner.includes('right') && '-right-1'
        )}
        style={{
          pointerEvents: 'auto',
          opacity: 0.95,
        }}
      >
        {stateRef.current.shelved ? '⟨' : '⟩'}
      </button>
    </div>
  );
}
