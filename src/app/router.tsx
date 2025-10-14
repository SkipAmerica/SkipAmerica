// Centralized routing configuration
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
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

export function AppRouter() {
  return (
    <BrowserRouter>
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
      <RatingModalManager />
    </BrowserRouter>
  )
}