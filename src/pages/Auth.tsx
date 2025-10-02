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

const Auth = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showInterestsSelection, setShowInterestsSelection] = useState(false)
  const [checkingInterests, setCheckingInterests] = useState(false)
  const inIframe = window.self !== window.top

  useEffect(() => {
    const checkUserInterests = async () => {
      if (!user) return

      setCheckingInterests(true)
      
      try {
        // Wait a bit for OAuth account type updates to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if user has already set interests
        const { data: profile } = await supabase
          .from('profiles')
          .select('interests, account_type')
          .eq('id', user.id)
          .single()

        // If user has no interests set, show interests selection
        if (!profile?.interests || profile.interests.length === 0) {
          setShowInterestsSelection(true)
        } else {
          // Check if creator needs onboarding
          if (profile.account_type === 'creator') {
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
              return
            }
          }

          // User has interests and (if creator) onboarding is done or skipped, redirect to home
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

  // Don't show auth form if user is logged in
  if (user && !showInterestsSelection) {
    return null // Will redirect via useEffect
  }

  return <SplashAuthForm onSuccess={() => navigate('/')} />
}

export default Auth