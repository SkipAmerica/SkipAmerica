import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from './AuthForm'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {fallback || <AuthForm />}
      </div>
    )
  }

  return <>{children}</>
}