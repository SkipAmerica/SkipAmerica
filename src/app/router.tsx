// Centralized routing configuration
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { AuthGuard } from './guards/auth-guard'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/Index'))
const AuthPage = lazy(() => import('@/pages/Auth'))
const ProfilePage = lazy(() => import('@/pages/Profile'))
const FeedPage = lazy(() => import('@/pages/Feed'))
const LobbyPage = lazy(() => import('@/pages/Lobby'))
const CallPage = lazy(() => import('@/pages/Call'))
const JoinQueuePage = lazy(() => import('@/pages/JoinQueue'))
const CreatorBlankPage = lazy(() => import('@/pages/CreatorBlank'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))

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
        
        <Route path="/join-queue/:creatorId" element={
          <RouteWrapper>
            <JoinQueuePage />
          </RouteWrapper>
        } />
        
        <Route path="/creator/blank" element={
          <RouteWrapper>
            <AuthGuard>
              <CreatorBlankPage />
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
    </BrowserRouter>
  )
}