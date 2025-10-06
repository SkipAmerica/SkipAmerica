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
import { toast } from 'sonner'
import backgroundVideo from '@/assets/Background_Loop.mp4'
import { Capacitor } from '@capacitor/core'

const Auth = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isWaitingForOAuth, setIsWaitingForOAuth] = useState(false)
  const [isInitiatingOAuth, setIsInitiatingOAuth] = useState(false)
  const inIframe = window.self !== window.top

  // Listen for OAuth success/error from popup
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
      } else if (event.data.type === 'oauth-error') {
        console.error('OAuth error received from popup')
        setIsInitiatingOAuth(false)
        setIsWaitingForOAuth(false)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Make status bar transparent on Auth page (iOS only)
  useEffect(() => {
    let cleanupFn: (() => Promise<void>) | null = null
    
    const setTransparentStatusBar = async () => {
      if (Capacitor.getPlatform() !== 'ios') return
      
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        
        // Make status bar transparent on Auth page
        await StatusBar.setOverlaysWebView({ overlay: true })
        await StatusBar.setStyle({ style: Style.Light })
        
        // Store cleanup function
        cleanupFn = async () => {
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setBackgroundColor({ color: "#FFFFFF" })
          await StatusBar.setStyle({ style: Style.Light })
        }
      } catch (error) {
        console.warn('[StatusBar] Failed to set transparent status bar:', error)
      }
    }
    
    setTransparentStatusBar()
    
    return () => {
      if (cleanupFn) {
        cleanupFn().catch(err => console.warn('[StatusBar] Cleanup error:', err))
      }
    }
  }, [])

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) return

      // Don't redirect if we just came from sign-out - allow auth state to settle
      if (window.location.pathname === '/auth' && !document.referrer.includes('/auth')) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      setIsWaitingForOAuth(false)
      setIsInitiatingOAuth(false)
      
      try {
        // Check if email is verified
        if (!user.email_confirmed_at) {
          console.log('Email not verified yet, showing message')
          toast.info('Please check your email to verify your account')
          setIsWaitingForOAuth(false)
          setIsInitiatingOAuth(false)
          return
        }

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

  // Safety timer for OAuth
  useEffect(() => {
    if (!isInitiatingOAuth) return

    const timer = setTimeout(() => {
      console.log('OAuth safety timeout - clearing initiating state')
      setIsInitiatingOAuth(false)
    }, 20000)

    return () => clearTimeout(timer)
  }, [isInitiatingOAuth])

  const showLoadingOverlay = isInitiatingOAuth || isWaitingForOAuth || !!user

  // Force dark background on html/body during OAuth to prevent white flash
  useEffect(() => {
    if (!showLoadingOverlay) return

    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')

    const prevHtml = html.style.backgroundColor
    const prevBody = body.style.backgroundColor
    const prevRoot = root?.style.backgroundColor ?? ''

    const darkBg = 'hsl(var(--skip-black))'
    html.style.backgroundColor = darkBg
    body.style.backgroundColor = darkBg
    if (root) root.style.backgroundColor = darkBg

    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
      if (root) root.style.backgroundColor = prevRoot
    }
  }, [showLoadingOverlay])

  return (
    <div className="fixed inset-0 bg-[hsl(var(--skip-black))] bg-gradient-splash">
      {/* Background video on top of gradient */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none z-10"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      
      {/* Always render the splash form for persistent background */}
      <div className="relative z-20">
        <SplashAuthForm
          onSuccess={() => navigate('/')}
          onOAuthStart={() => setIsInitiatingOAuth(true)}
          onOAuthEnd={() => {
            setIsInitiatingOAuth(false)
            setIsWaitingForOAuth(false)
          }}
        />
      </div>
      
      {/* Loading overlay on top when OAuth is in progress */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-[hsl(var(--skip-black))] flex items-center justify-center z-50">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-white/90">
              {isInitiatingOAuth ? 'Opening sign-in...' : 'Setting up your profile...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Auth