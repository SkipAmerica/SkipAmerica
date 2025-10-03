import { SplashAuthForm } from '@/components/auth/SplashAuthForm'
import { useAuth } from '@/app/providers/auth-provider'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { IOSNavBar } from '@/components/mobile/IOSNavBar'
import { Home, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

const Auth = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isWaitingForOAuth, setIsWaitingForOAuth] = useState(false)
  const inIframe = window.self !== window.top

  // Listen for OAuth success from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'oauth-success') {
        console.log('OAuth success received from popup')
        setIsWaitingForOAuth(true)
        
        // Explicitly refresh session in parent window
        console.log('Refreshing parent window session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error refreshing session:', error)
          setIsWaitingForOAuth(false)
          return
        }
        
        if (session) {
          console.log('Session found:', session.user.email)
          // The auth provider will pick this up via onAuthStateChange
        }
        
        // Safety timeout - clear waiting state after 15 seconds if user state doesn't update
        setTimeout(() => {
          console.log('OAuth timeout - clearing waiting state')
          setIsWaitingForOAuth(false)
        }, 15000)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) return

      setIsWaitingForOAuth(false) // Clear waiting state once we have user
      
      try {
        // Wait a bit for OAuth account type updates to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check account type
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .single()

        // Creators: Handle onboarding flow
        if (profile?.account_type === 'creator') {
          // Wait for creator record and onboarding to be initialized
          let attempts = 0
          let onboarding = null
          
          while (attempts < 5 && !onboarding) {
            const { data } = await supabase
              .from('creator_onboarding')
              .select('percent_complete, onboarding_skipped')
              .eq('creator_id', user.id)
              .maybeSingle()
            
            if (data) {
              onboarding = data
              break
            }
            
            await new Promise(resolve => setTimeout(resolve, 500))
            attempts++
          }

          // Redirect to onboarding if incomplete and not skipped
          if (onboarding && onboarding.percent_complete < 100 && !onboarding.onboarding_skipped) {
            navigate('/onboarding/creator')
          } else {
            // Creator has completed onboarding, redirect to home
            navigate('/')
          }
          return
        }

        // All other users: redirect to home
        navigate('/')
      } catch (error) {
        console.error('Error checking user profile:', error)
        navigate('/')
      }
    }

    if (user) {
      checkUserProfile()
    }
  }, [user, navigate])

  // Show loading while waiting for OAuth or checking profile
  if (isWaitingForOAuth || user) {
    return (
      <div className="fixed inset-0 bg-gradient-splash flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-white/90">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  return <SplashAuthForm onSuccess={() => navigate('/')} />
}

export default Auth