// Centralized routing configuration
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import * as React from 'react'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { AuthGuard } from './guards/auth-guard'
import { RatingModalManager } from '@/components/ratings/RatingModalManager'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/Index'))
const AuthPage = lazy(() => import('@/pages/Auth'))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallback'))
const ProfilePage = lazy(() => import('@/pages/Profile'))
const FeedPage = lazy(() => import('@/pages/Feed'))
const LobbyPage = lazy(() => import('@/pages/Lobby'))
const CallPage = lazy(() => import('@/pages/Call'))
const JoinQueuePage = lazy(() => import('@/pages/JoinQueue'))
const InboxPage = lazy(() => import('@/pages/Inbox'))
const ThreadViewPage = lazy(() => import('@/pages/ThreadView'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))
const DevCanvasPage = lazy(() => import('@/pages/DevCanvas'))
const CreatorOnboardingPage = lazy(() => import('@/pages/CreatorOnboarding'))
const AlmightySessionPage = lazy(() => import('@/routes/AlmightySession'))
const DevAlmightyPage = lazy(() => import('@/routes/DevAlmighty'))

// Route wrapper with error boundary and suspense
function RouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// Rating modal guard to prevent interference with route transitions
function RatingModalWithLoadingGuard() {
  const location = useLocation()
  const [isReady, setIsReady] = useState(false)

  console.log('[RatingModalGuard] render', { 
    pathname: location.pathname, 
    search: location.search, 
    isReady,
    timestamp: performance.now() 
  })

  // Only engage the guard if rating modal is requested (sr=1)
  const hasSr = new URLSearchParams(location.search).get('sr') === '1'

  // Wait for route transitions to settle before rendering rating modal
  // This prevents the modal from interfering with page loads
  useEffect(() => {
    console.log('[RatingModalGuard] effect triggered', { hasSr, pathname: location.pathname })
    
    // If no rating modal requested, we're ready immediately
    setIsReady(!hasSr)
    
    if (!hasSr) {
      console.log('[RatingModalGuard] no sr=1, ready immediately')
      return
    }
    
    console.log('[RatingModalGuard] sr=1 detected, setting timer')
    const timer = setTimeout(() => {
      console.log('[RatingModalGuard] timer fired, ready')
      setIsReady(true)
    }, 200) // Small delay to let route stabilize
    
    return () => {
      console.log('[RatingModalGuard] cleanup timer')
      clearTimeout(timer)
    }
  }, [location.pathname, hasSr])

  if (!isReady) {
    console.log('[RatingModalGuard] not ready, returning null')
    return null
  }

  console.log('[RatingModalGuard] ready, rendering RatingModalManager')
  return <RatingModalManager />
}

// Route change monitor to detect loops
function RouteChangeMonitor() {
  const location = useLocation()
  const routeCountRef = React.useRef(0)
  const lastResetRef = React.useRef(Date.now())
  
  React.useEffect(() => {
    const now = Date.now()
    const elapsed = now - lastResetRef.current
    
    // Reset counter every 2 seconds
    if (elapsed > 2000) {
      routeCountRef.current = 0
      lastResetRef.current = now
    }
    
    routeCountRef.current++
    
    console.log('[RouteMonitor] route change', {
      pathname: location.pathname,
      search: location.search,
      count: routeCountRef.current,
      elapsed,
      timestamp: performance.now()
    })
    
    // Warn if we see >10 route updates in 2 seconds
    if (routeCountRef.current > 10) {
      console.warn('[RouteMonitor] LOOP DETECTED: >10 route changes in 2s', {
        count: routeCountRef.current,
        pathname: location.pathname,
        search: location.search
      })
    }
  }, [location.pathname, location.search])
  
  return null
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RouteChangeMonitor />
      <Routes>
        <Route path="/auth" element={
          <RouteWrapper>
            <AuthPage />
          </RouteWrapper>
        } />
        
        <Route path="/oauth-callback" element={
          <RouteWrapper>
            <OAuthCallbackPage />
          </RouteWrapper>
        } />
        
        <Route path="/" element={
          <RouteWrapper>
            <AuthGuard>
              <HomePage />
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/profile" element={
          <RouteWrapper>
            <AuthGuard>
              <ProfilePage />
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/feed" element={
          <RouteWrapper>
            <AuthGuard>
              <FeedPage />
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/lobby" element={
          <RouteWrapper>
            <AuthGuard>
              <div>Lobby placeholder - TODO: implement proper routing</div>
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/call" element={
          <RouteWrapper>
            <AuthGuard>
              <div>Call placeholder - TODO: implement proper routing</div>
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/inbox" element={
          <RouteWrapper>
            <AuthGuard>
              <InboxPage />
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/inbox/thread/:threadId" element={
          <RouteWrapper>
            <AuthGuard>
              <ThreadViewPage />
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/join-queue/:creatorId" element={
          <RouteWrapper>
            <JoinQueuePage />
          </RouteWrapper>
        } />
        
        <Route path="/dev-canvas" element={
          <RouteWrapper>
            <DevCanvasPage />
          </RouteWrapper>
        } />

        {/* Almighty Session Routes */}
        <Route path="/session/:sessionId" element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <AlmightySessionPage />
            </Suspense>
          </ErrorBoundary>
        } />

        {process.env.NODE_ENV !== 'production' && (
          <Route path="/dev/almighty" element={
            <RouteWrapper>
              <DevAlmightyPage />
            </RouteWrapper>
          } />
        )}
        
        <Route path="/onboarding/creator" element={
          <RouteWrapper>
            <AuthGuard>
              <CreatorOnboardingPage />
            </AuthGuard>
          </RouteWrapper>
        } />
        
        <Route path="/404" element={
          <RouteWrapper>
            <NotFoundPage />
          </RouteWrapper>
        } />
        
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      
      {/* Global Rating Modal Manager - renders inside router context */}
      <RatingModalWithLoadingGuard />
    </BrowserRouter>
  )
}