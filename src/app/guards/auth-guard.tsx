// Authentication guard for protected routes
import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers/auth-provider'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export function AuthGuard({ children, redirectTo = '/auth' }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}