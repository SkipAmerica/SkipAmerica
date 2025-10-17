import { useAuth } from '@/app/providers/auth-provider'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Authentication Guard
 * 
 * Route-level guard that handles:
 * - Authentication verification
 * - Onboarding redirect for creators
 * - Loading states
 * 
 * Single responsibility: Navigation decisions based on auth state
 */
export function AuthGuard({ children, redirectTo = '/auth' }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) {
      setProfileLoading(false)
      return
    }

    // Check if user needs onboarding
    const checkProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .single()

        // Creators need onboarding check
        if (profile?.account_type === 'creator') {
          const { data: onboarding } = await supabase
            .from('creator_onboarding')
            .select('percent_complete, onboarding_skipped')
            .eq('creator_id', user.id)
            .maybeSingle()

          if (onboarding && onboarding.percent_complete < 100 && !onboarding.onboarding_skipped) {
            setRedirectPath('/onboarding/creator')
            return
          }
        }

        setRedirectPath(null)
      } catch (error) {
        console.error('[AuthGuard] Profile check failed:', error)
        setRedirectPath(null)
      } finally {
        setProfileLoading(false)
      }
    }

    checkProfile()
  }, [user, authLoading])

  // Show loading while auth is initializing
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    )
  }

  // Not authenticated → redirect to /auth
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Need onboarding → redirect
  if (redirectPath && location.pathname !== redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  // Authenticated and ready
  return <>{children}</>
}
