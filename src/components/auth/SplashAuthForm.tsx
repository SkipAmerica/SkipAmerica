import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/app/providers/auth-provider'
import { Loader2, Users, Crown, LogIn } from 'lucide-react'
import { InterestsSelection } from './InterestsSelection'

interface SplashAuthFormProps {
  onSuccess?: () => void
}

type AuthStep = 'main' | 'creator-setup' | 'user-setup' | 'signin' | 'interests'

export const SplashAuthForm = ({ onSuccess }: SplashAuthFormProps) => {
  const { signInWithGoogle, signInWithApple, loading, user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<AuthStep>('main')
  const [accountType, setAccountType] = useState<'creator' | 'fan'>('fan')

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true)
    
    // Store account type in localStorage so we can use it after OAuth redirect
    if (accountType) {
      localStorage.setItem('pending_account_type', accountType)
    }
    
    if (provider === 'google') {
      await signInWithGoogle()
    } else {
      await signInWithApple()
    }
    
    setIsLoading(false)
  }

  const handleInterestsComplete = () => {
    setStep('main')
    onSuccess?.()
  }

  // Show interests selection if user just signed up and is logged in
  if (step === 'interests' && user) {
    return (
      <div className="fixed inset-0 bg-gradient-splash flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <InterestsSelection onComplete={handleInterestsComplete} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-splash flex flex-col items-center justify-center p-6 overflow-y-auto">
      {/* Skip Logo */}
      <div className="mb-12 animate-fade-in">
        <h1 className="text-5xl font-bold text-white">
          <span>Sk</span>
          <span className="relative">
            <span>i</span>
            <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full"></span>
          </span>
          <span>p</span>
        </h1>
      </div>

      {/* Main Auth Options */}
      {step === 'main' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          {/* Primary Actions */}
          <div className="space-y-4">
            <Button
              onClick={() => {
                setAccountType('creator')
                setStep('creator-setup')
              }}
              className="w-full h-16 text-lg font-semibold bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 backdrop-blur-sm transition-all"
              disabled={isLoading || loading}
            >
              <Crown className="mr-3 h-6 w-6" />
              I'm a Creator
            </Button>

            <Button
              onClick={() => {
                setAccountType('fan')
                setStep('user-setup')
              }}
              className="w-full h-16 text-lg font-semibold bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 backdrop-blur-sm transition-all"
              disabled={isLoading || loading}
            >
              <Users className="mr-3 h-6 w-6" />
              I'm a User
            </Button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setStep('signin')}
              className="text-white/90 hover:text-white underline"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </div>
      )}

      {/* Creator Setup */}
      {step === 'creator-setup' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          <div className="text-center mb-8">
            <Crown className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Join as Creator</h2>
            <p className="text-white/80">Share your expertise and build your audience</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleSocialAuth('google')}
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <Button
              onClick={() => handleSocialAuth('apple')}
              className="w-full h-14 text-base font-semibold bg-black hover:bg-gray-900 text-white transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Continue with Apple
            </Button>
          </div>

          <Button
            variant="link"
            onClick={() => setStep('main')}
            className="w-full text-white/90 hover:text-white"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* User Setup */}
      {step === 'user-setup' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          <div className="text-center mb-8">
            <Users className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Join as User</h2>
            <p className="text-white/80">Discover and connect with creators</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleSocialAuth('google')}
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <Button
              onClick={() => handleSocialAuth('apple')}
              className="w-full h-14 text-base font-semibold bg-black hover:bg-gray-900 text-white transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Continue with Apple
            </Button>
          </div>

          <Button
            variant="link"
            onClick={() => setStep('main')}
            className="w-full text-white/90 hover:text-white"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Sign In */}
      {step === 'signin' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          <div className="text-center mb-8">
            <LogIn className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-white/80">Sign in to continue</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleSocialAuth('google')}
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Sign in with Google
            </Button>

            <Button
              onClick={() => handleSocialAuth('apple')}
              className="w-full h-14 text-base font-semibold bg-black hover:bg-gray-900 text-white transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Sign in with Apple
            </Button>
          </div>

          <Button
            variant="link"
            onClick={() => setStep('main')}
            className="w-full text-white/90 hover:text-white"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Terms and Privacy */}
      <div className="mt-12 text-center text-sm text-white/70 max-w-md">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  )
}
