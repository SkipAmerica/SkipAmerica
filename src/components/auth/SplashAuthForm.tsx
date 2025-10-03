import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/app/providers/auth-provider'
import { Loader2, Binoculars, TowerControl, LogIn, Mail, HelpCircle } from 'lucide-react'
import { InterestsSelection } from './InterestsSelection'
import { toast } from 'sonner'
import { isMobile } from '@/shared/lib/platform'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SplashAuthFormProps {
  onSuccess?: () => void
}

type AuthStep = 'main' | 'creator-setup' | 'user-setup' | 'signin' | 'interests' | 'creator-email' | 'user-email' | 'signin-email'

export const SplashAuthForm = ({ onSuccess }: SplashAuthFormProps) => {
  const { signInWithGoogle, signInWithApple, signIn, signUp, loading, user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<AuthStep>('main')
  const [accountType, setAccountType] = useState<'creator' | 'fan'>('fan')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  
  // Email/password form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [formError, setFormError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      console.log(`Starting ${provider} OAuth flow...`)
      
      // Store account type in localStorage so we can use it after OAuth redirect
      if (accountType) {
        localStorage.setItem('pending_account_type', accountType)
        console.log('Stored account type:', accountType)
      }
      
      // Show loading overlay for mobile to prevent white screen
      if (provider === 'google' && isMobile()) {
        setIsGoogleLoading(true)
      }
      
      const { error } = provider === 'google' 
        ? await signInWithGoogle()
        : await signInWithApple()
      
      // Clear loading state
      setIsGoogleLoading(false)
      
      if (error) {
        console.error(`${provider} OAuth error:`, error)
        toast.error(error.message || `Failed to sign in with ${provider}`)
      }
    } catch (err) {
      console.error(`${provider} OAuth exception:`, err)
      toast.error(`An error occurred during ${provider} sign-in`)
      setIsGoogleLoading(false)
    }
  }

  const handleInterestsComplete = () => {
    setStep('main')
    onSuccess?.()
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    
    if (!email || !password || !fullName) {
      setFormError('All fields are required')
      return
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }
    
    setIsLoading(true)
    const { error } = await signUp(email, password, fullName, accountType)
    setIsLoading(false)
    
    if (error) {
      setFormError(error.message || 'Failed to sign up')
      toast.error(error.message || 'Failed to sign up')
    } else {
      toast.success('Account created! Please check your email to verify.')
      
      // Creators go directly to onboarding, users go to interests
      if (accountType === 'creator') {
        window.location.href = '/onboarding/creator'
        return
      }
      
      setStep('interests')
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    
    if (!email || !password) {
      setFormError('Email and password are required')
      return
    }
    
    setIsLoading(true)
    const { error } = await signIn(email, password)
    setIsLoading(false)
    
    if (error) {
      setFormError(error.message || 'Failed to sign in')
      toast.error(error.message || 'Failed to sign in')
    } else {
      toast.success('Welcome back!')
      onSuccess?.()
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setFormError('')
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
      {/* Help Button */}
      <button
        onClick={() => setShowHelp(true)}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white transition-all"
        aria-label="Help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-white/10 backdrop-blur-lg border-white/30 max-w-md animate-scale-in">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl text-white/90 font-semibold">Choose Your Role</DialogTitle>
            <DialogDescription className="sr-only">
              Learn about Creator and User roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 pt-6">
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200/30 via-yellow-300/20 to-amber-400/30 backdrop-blur-sm border border-amber-300/40 flex items-center justify-center">
                  <TowerControl className="h-5 w-5 text-amber-100" />
                </div>
                <h3 className="font-semibold text-xl text-white">Creator</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed pl-13">
                Skip empowers you to share your expertise, cultivate meaningful connections, and turn influence into lasting impact.
              </p>
            </div>
            
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-200/30 via-sky-300/20 to-cyan-400/30 backdrop-blur-sm border border-cyan-300/40 flex items-center justify-center">
                  <Binoculars className="h-5 w-5 text-cyan-100" />
                </div>
                <h3 className="font-semibold text-xl text-white">User</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed pl-13">
                Gain rare, one-on-one access to the people who can inspire, guide, and transform your life and journey.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <TowerControl className="mr-3 h-6 w-6" />
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
              <Binoculars className="mr-3 h-6 w-6" />
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
            <TowerControl className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Join as Creator</h2>
            <p className="text-white/80">Share your expertise and build your audience</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleSocialAuth('google')}
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading || isGoogleLoading}
            >
              {isGoogleLoading ? (
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
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-splash px-2 text-white/70">Or</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setStep('creator-email')
              }}
              className="w-full h-14 text-base font-semibold bg-white/5 hover:bg-white/10 text-white border-white/30 transition-all"
              disabled={isLoading || loading}
            >
              <Mail className="mr-3 h-5 w-5" />
              Sign up with Email
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
            <Binoculars className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Join as User</h2>
            <p className="text-white/80">Discover and connect with creators</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleSocialAuth('google')}
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading || isGoogleLoading}
            >
              {isGoogleLoading ? (
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
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-splash px-2 text-white/70">Or</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setStep('user-email')
              }}
              className="w-full h-14 text-base font-semibold bg-white/5 hover:bg-white/10 text-white border-white/30 transition-all"
              disabled={isLoading || loading}
            >
              <Mail className="mr-3 h-5 w-5" />
              Sign up with Email
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
              disabled={isLoading || loading || isGoogleLoading}
            >
              {isGoogleLoading ? (
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
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-splash px-2 text-white/70">Or</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setStep('signin-email')
              }}
              className="w-full h-14 text-base font-semibold bg-white/5 hover:bg-white/10 text-white border-white/30 transition-all"
              disabled={isLoading || loading}
            >
              <Mail className="mr-3 h-5 w-5" />
              Sign in with Email
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

      {/* Creator Email Signup */}
      {step === 'creator-email' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          <div className="text-center mb-8">
            <TowerControl className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Join as Creator</h2>
            <p className="text-white/80">Create your account with email</p>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
                minLength={6}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-300 bg-red-500/20 p-3 rounded-md">{formError}</p>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <Button
            variant="link"
            onClick={() => setStep('creator-setup')}
            className="w-full text-white/90 hover:text-white"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* User Email Signup */}
      {step === 'user-email' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          <div className="text-center mb-8">
            <Binoculars className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Join as User</h2>
            <p className="text-white/80">Create your account with email</p>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
                minLength={6}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-300 bg-red-500/20 p-3 rounded-md">{formError}</p>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <Button
            variant="link"
            onClick={() => setStep('user-setup')}
            className="w-full text-white/90 hover:text-white"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Email Sign In */}
      {step === 'signin-email' && (
        <div className="w-full max-w-md space-y-6 animate-scale-in">
          <div className="text-center mb-8">
            <LogIn className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-white/80">Sign in with your email</p>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                required
              />
            </div>

            {formError && (
              <p className="text-sm text-red-300 bg-red-500/20 p-3 rounded-md">{formError}</p>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-white hover:bg-white/90 text-gray-900 transition-all"
              disabled={isLoading || loading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <Button
            variant="link"
            onClick={() => setStep('signin')}
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

      {/* Google Loading Overlay for Mobile */}
      {isGoogleLoading && (
        <div className="fixed inset-0 bg-gradient-splash flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
            <p className="text-white/90 text-lg">Opening Google...</p>
            <p className="text-white/70 text-sm mt-2">Please wait while we redirect you</p>
          </div>
        </div>
      )}
    </div>
  )
}
