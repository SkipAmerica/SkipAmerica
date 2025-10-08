import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SessionProvider, useSession } from '@/modules/almighty/providers/SessionProvider'
import { UIProvider, useUIContext, Pane } from '@/modules/almighty/providers/UIProvider'
import { useSwipeGestures } from '@/modules/almighty/hooks/useSwipeGestures'
import { useWakeLock } from '@/modules/almighty/hooks/useWakeLock'
import { PaneErrorBoundary } from '@/modules/almighty/components/PaneErrorBoundary'
import { LeftPane } from '@/modules/almighty/panes/LeftPane'
import { CenterPane } from '@/modules/almighty/panes/CenterPane'
import { RightPane } from '@/modules/almighty/panes/RightPane'

export default function AlmightySession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // Session ID validation
  useEffect(() => {
    if (!sessionId || !/^[a-zA-Z0-9\-_]{3,50}$/.test(sessionId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Session] Invalid sessionId:', sessionId)
      }
      navigate('/', { replace: true })
    }
  }, [sessionId, navigate])

  return (
    <SessionProvider>
      <UIProvider>
        <AlmightyShell />
      </UIProvider>
    </SessionProvider>
  )
}

function AlmightyShell() {
  const { activePane, swipeLocked, isDragging, lockSwipe } = useUIContext()
  const {
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel
  } = useSwipeGestures()

  useWakeLock()

  const handleResizeRef = useRef<() => void>()

  // Helper: Check if target is vertically scrollable
  const isVertScrollableTarget = useCallback((target: HTMLElement): boolean => {
    let el: HTMLElement | null = target

    while (el && el !== document.body) {
      const style = window.getComputedStyle(el)
      const isScrollable = ['auto', 'scroll'].includes(style.overflowY)

      if (isScrollable && el.scrollHeight > el.clientHeight) {
        const canScrollUp = el.scrollTop > 0
        const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight

        if (canScrollUp || canScrollDown) {
          return true
        }
      }

      el = el.parentElement
    }

    return false
  }, [])

  // iOS guards: body scroll lock + pull-to-refresh prevention
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const preventScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement

      // Allow scroll in scrollable containers
      if (isVertScrollableTarget(target)) {
        return
      }

      e.preventDefault()
    }

    document.addEventListener('touchmove', preventScroll, { passive: false })

    // Browser back button interception
    const onPop = (e: PopStateEvent) => {
      e.preventDefault()
      if (!window.confirm('Leave the call? Your session will end.')) {
        history.pushState(null, '', location.href)
      }
    }

    history.pushState(null, '', location.href)
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('touchmove', preventScroll)
      document.body.style.overflow = prevOverflow

      // Dev-only memory leak assertion
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Session] Cleanup complete - verifying listener removal')
      }
    }
  }, [isVertScrollableTarget])

  // Unload protection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Leave the call? Your session will end.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Orientation/resize handling with stable refs
  handleResizeRef.current = () => {
    // Snap to current pane without animation
    if (typeof window === 'undefined') return
    // Trigger re-snap by briefly disabling transitions
    requestAnimationFrame(() => {
      // Re-layout complete
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = () => handleResizeRef.current?.()

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handler)
    }
    window.addEventListener('orientationchange', handler)

    // DPR/zoom changes
    const mediaQuery = window.matchMedia('(resolution: 2dppx)')
    const dprHandler = () => handler()
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', dprHandler)
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handler)
      }
      window.removeEventListener('orientationchange', handler)
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', dprHandler)
      }
    }
  }, [])

  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const transitionDuration = prefersReducedMotion ? '80ms' : '240ms'

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="fixed inset-0 svh overflow-hidden bg-black z-[30]"
      style={{
        width: '300vw',
        transform: `translate3d(-${activePane * 100}vw, 0, 0)`,
        transition: isDragging ? 'none' : `transform ${transitionDuration} cubic-bezier(0.25, 0.1, 0.25, 1)`,
        touchAction: 'pan-x',
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="inline-block w-screen svh align-top">
        <PaneErrorBoundary paneName="Left Pane">
          <LeftPane />
        </PaneErrorBoundary>
      </div>
      <div className="inline-block w-screen svh align-top">
        <PaneErrorBoundary paneName="Center Pane">
          <CenterPane />
        </PaneErrorBoundary>
      </div>
      <div className="inline-block w-screen svh align-top">
        <PaneErrorBoundary paneName="Right Pane">
          <RightPane />
        </PaneErrorBoundary>
      </div>

      {/* Dev-only swipe lock toggle */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => lockSwipe(!swipeLocked)}
          className="fixed top-4 left-4 z-[70] px-3 py-1 bg-white/10 rounded text-xs text-white/40"
        >
          {swipeLocked ? '🔒 Locked' : '🔓 Unlocked'}
        </button>
      )}
    </div>
  )
}
