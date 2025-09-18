import { AuthForm } from '@/components/auth/AuthForm'
import { InterestsSelection } from '@/components/auth/InterestsSelection'
import { useAuth } from '@/app/providers/auth-provider'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">
                <span className="text-skip-black">Sk</span>
                <span className="relative">
                  <span className="text-skip-black">i</span>
                  <span className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-skip-orange rounded-full"></span>
                </span>
                <span className="text-skip-black">p</span>
              </h1>
              <div className="text-lg font-semibold">Complete Your Profile</div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <InterestsSelection onComplete={handleInterestsComplete} />
        </div>
      </div>
    )
  }

  // Don't show auth form if user is logged in
  if (user && !showInterestsSelection) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">
              <span className="text-skip-black">Sk</span>
              <span className="relative">
                <span className="text-skip-black">i</span>
                <span className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-skip-orange rounded-full"></span>
              </span>
              <span className="text-skip-black">p</span>
            </h1>
            <div className="text-lg font-semibold">Sign In</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <AuthForm onSuccess={() => navigate('/')} />
        </div>
      </div>
    </div>
  )
}

export default Auth