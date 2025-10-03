import { SplashAuthForm } from '@/components/auth/SplashAuthForm'
import { InterestsSelection } from '@/components/auth/InterestsSelection'
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
  const [showInterestsSelection, setShowInterestsSelection] = useState(false)
  const [checkingInterests, setCheckingInterests] = useState(false)
  const [isWaitingForOAuth, setIsWaitingForOAuth] = useState(false)
  const inIframe = window.self !== window.top

  // Listen for OAuth success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'oauth-success') {
        console.log('OAuth success received from popup')
        setIsWaitingForOAuth(true)
        
        // Safety timeout - clear waiting state after 15 seconds if user state doesn't update
        setTimeout(() => {
          setIsWaitingForOAuth(false)
        }, 15000)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const checkUserInterests = async () => {
      if (!user) return

      setCheckingInterests(true)
      setIsWaitingForOAuth(false) // Clear waiting state once we have user
      
      try {
        // Wait a bit for OAuth account type updates to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check account type first
        const { data: profile } = await supabase
          .from('profiles')
          .select('interests, account_type')
          .eq('id', user.id)
          .single()

        // Creators: Handle onboarding flow, NEVER show interests
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
          
          setCheckingInterests(false)
          return // Exit early - never set showInterestsSelection for creators
        }

        // Users/Fans ONLY: Check interests
        if (!profile?.interests || profile.interests.length === 0) {
          setShowInterestsSelection(true)
        } else {
          // User has interests, redirect to home
          navigate('/')
        }
      } catch (error) {
        console.error('Error checking user interests:', error)
        navigate('/')
      } finally {
        setCheckingInterests(false)
      }
    }

    if (user) {
      checkUserInterests()
    }
  }, [user, navigate])

  const handleInterestsComplete = () => {
    setShowInterestsSelection(false)
    navigate('/')
  }

  // Show interests selection for logged-in users without interests
  if (user && showInterestsSelection && !checkingInterests) {
    return (
      <IOSAppShell>
        <IOSNavBar 
          title="Complete Your Profile"
          leftButton={{
            text: "Skip",
            onClick: handleInterestsComplete
          }}
        />
        
        <div className="ios-content flex-1 flex items-center justify-center p-4">
          <InterestsSelection onComplete={handleInterestsComplete} />
        </div>
      </IOSAppShell>
    )
  }

  // Show loading while waiting for OAuth or checking profile
  if (isWaitingForOAuth || (user && !showInterestsSelection && checkingInterests)) {
    return (
      <div className="fixed inset-0 bg-gradient-splash flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-white/90">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  // Don't show auth form if user is logged in and we're not checking/showing interests
  if (user && !showInterestsSelection && !checkingInterests) {
    return (
      <div className="fixed inset-0 bg-gradient-splash flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-white/90">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <SplashAuthForm onSuccess={() => navigate('/')} />
}

export default Auth