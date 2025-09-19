import { AuthForm } from '@/components/auth/AuthForm'
import { InterestsSelection } from '@/components/auth/InterestsSelection'
import { useAuth } from '@/app/providers/auth-provider'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { IOSNavBar } from '@/components/mobile/IOSNavBar'
import { Home } from 'lucide-react'

const Auth = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showInterestsSelection, setShowInterestsSelection] = useState(false)
  const [checkingInterests, setCheckingInterests] = useState(false)

  useEffect(() => {
    const checkUserInterests = async () => {
      if (!user) return

      setCheckingInterests(true)
      
      try {
        // Check if user has already set interests
        const { data: profile } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single()

        // If user has no interests set, show interests selection
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
        
        <div className="ios-content flex-1 flex items-center justify-center p-4 pt-20">
          <InterestsSelection onComplete={handleInterestsComplete} />
        </div>
      </IOSAppShell>
    )
  }

  // Don't show auth form if user is logged in
  if (user && !showInterestsSelection) {
    return null // Will redirect via useEffect
  }

  return (
    <IOSAppShell>
      <IOSNavBar 
        title="Sign In"
        rightButton={{
          icon: Home,
          onClick: () => navigate('/')
        }}
      />
      
      <div className="ios-content flex-1 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          <AuthForm onSuccess={() => navigate('/')} />
        </div>
      </div>
    </IOSAppShell>
  )
}

export default Auth