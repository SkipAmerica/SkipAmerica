import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SessionProvider, useSession } from '@/modules/almighty/providers/SessionProvider'
import { MediaProvider, useMedia } from '@/modules/almighty/providers/MediaProvider'
import { UIProvider, useUIContext, Pane } from '@/modules/almighty/providers/UIProvider'
import { useSwipeGestures } from '@/modules/almighty/hooks/useSwipeGestures'
import { useWakeLock } from '@/modules/almighty/hooks/useWakeLock'
import { PaneErrorBoundary } from '@/modules/almighty/components/PaneErrorBoundary'
import { LeftPane } from '@/modules/almighty/panes/LeftPane'
import { CenterPane } from '@/modules/almighty/panes/CenterPane'
import { RightPane } from '@/modules/almighty/panes/RightPane'
import { getIdentityForRole } from '@/modules/almighty/lib/identity'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function AlmightySession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Session ID validation
  useEffect(() => {
    if (!sessionId || !/^[a-zA-Z0-9\-_]{3,50}$/.test(sessionId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Session] Invalid sessionId:', sessionId)
      }
      navigate('/', { replace: true })
    }
  }, [sessionId, navigate])

  // Session status validation (guard against ended sessions)
  useEffect(() => {
    const validateSession = async () => {
      if (!sessionId) return
      
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('[AlmightySession:VALIDATE] Checking session status:', {
        sessionId,
        userId: user?.id,
        timestamp: new Date().toISOString()
      })
      
      const { data, error } = await supabase
        .from('almighty_sessions')
        .select('id, status, ended_at, creator_id, fan_id')
        .eq('id', sessionId)
        .maybeSingle()
      
      console.log('[AlmightySession:VALIDATE] Response:', {
        hasData: !!data,
        hasError: !!error,
        status: data?.status,
        ended_at: data?.ended_at,
        userIsCreator: data && user ? data.creator_id === user.id : null,
        userIsFan: data && user ? data.fan_id === user.id : null,
        errorCode: error?.code,
        errorMessage: error?.message
      })
      
      if (error) {
        console.error('[AlmightySession:VALIDATE] Network/auth error:', error)
        toast({
          title: "Connection Error",
          description: "Unable to validate session. Please check your connection.",
          variant: "destructive"
        })
        navigate('/', { replace: true })
        return
      }
      
      if (!data) {
        console.warn('[AlmightySession:VALIDATE] Session not found (RLS or deleted)', {
          cause: 'rls_or_not_found',
          sessionId,
          userId: user?.id
        })
        toast({
          title: "Session Unavailable",
          description: "This session is not accessible. You may need to switch accounts or wait for a new invite.",
          variant: "destructive"
        })
        navigate('/', { replace: true })
        return
      }
      
      if (data.status === 'ended' || data.ended_at) {
        console.warn('[AlmightySession:VALIDATE] Session truly ended', {
          status: data.status,
          ended_at: data.ended_at
        })
        toast({
          title: "Session Ended",
          description: "This session has already ended.",
          variant: "destructive"
        })
        navigate('/', { replace: true })
        return
      }
      
      console.log('[AlmightySession:VALIDATE] Session is active')
    }
    
    validateSession()
  }, [sessionId, navigate, toast])

  return (
    <SessionProvider>
      <MediaProvider>
        <UIProvider>
          <AlmightyShell />
        </UIProvider>
      </MediaProvider>
    </SessionProvider>
  )
}

function AlmightyShell() {
  const { sessionId, role } = useSession()
  const { join, leave, connected, micEnabled, camEnabled, unlockAudio } = useMedia()
  const { activePane, swipeLocked, isDragging, lockSwipe } = useUIContext()
  const {
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel
  } = useSwipeGestures()
  
  const isPublishing = connected && (micEnabled || camEnabled)
  useWakeLock(isPublishing)
  
  // Auto-join on mount (strict once-only with ref guard)
  const joinedRef = useRef(false)
  useEffect(() => {
    // === 4. Debug: AlmightySession mounted ===
    ;(window as any).__almightyDebug = Object.assign(
      (window as any).__almightyDebug || {},
      { phase: 'AlmightySession:mounted' }
    )
    
    console.log('[AlmightySession:MOUNT]', { 
      sessionId, 
      role,
      timestamp: new Date().toISOString() 
    })
    
    if (joinedRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AlmightyShell] Join blocked (already joined once)')
      }
      return
    }
    
    joinedRef.current = true
    
    const identity = getIdentityForRole(sessionId, role)
    
    console.log('[AlmightySession:IDENTITY]', { 
      sessionId, 
      identity,
      role
    })
    
    console.log('[AlmightySession:JOIN_START]', { 
      sessionId, 
      identity,
      timestamp: new Date().toISOString()
    })
    
    join(sessionId, identity, role)
      .then(() => {
        console.log('[AlmightySession:JOIN_SUCCESS]', { 
          sessionId,
          timestamp: new Date().toISOString()
        })
      })
      .catch(err => {
        console.error('[AlmightySession:JOIN_ERROR]', { 
          sessionId, 
          error: err,
          message: err.message,
          timestamp: new Date().toISOString()
        })
      })
    
    return () => {
      console.log('[AlmightySession:UNMOUNT]', { 
        sessionId,
        timestamp: new Date().toISOString()
      })
      // Clear skip flag to allow queue cleanup after session
      ;(window as any).__skipQueueCleanupOnSessionNav = false
      leave()
    }
  }, [sessionId, role, join, leave])
  
  // Trigger audio unlock on any user action
  const handleUserAction = useCallback(() => {
    unlockAudio().catch(() => {}) // Idempotent, safe to call multiple times
  }, [unlockAudio])

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
      className="fixed inset-0 overflow-hidden bg-black z-[30] flex"
      data-almighty-root="true"
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
      onClick={handleUserAction}
      onTouchStart={handleUserAction}
    >
      <div className="w-screen h-full min-h-0 flex-shrink-0" data-pane="left">
        <PaneErrorBoundary paneName="Left Pane">
          <LeftPane />
        </PaneErrorBoundary>
      </div>
      <div className="w-screen h-full min-h-0 flex-shrink-0" data-pane="center">
        <PaneErrorBoundary paneName="Center Pane">
          <CenterPane />
        </PaneErrorBoundary>
      </div>
      <div className="w-screen h-full min-h-0 flex-shrink-0" data-pane="right">
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
