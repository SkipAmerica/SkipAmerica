// Centralized authentication provider
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { isMobile } from '@/shared/lib/platform'
import { Capacitor } from '@capacitor/core'

interface AuthContextType {
  user: User | null
  session: Session | null
  sessionToken: string | null
  sessionId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string, accountType?: 'fan' | 'creator' | 'agency' | 'industry_resource') => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  resendConfirmation: (email: string) => Promise<{ error: any }>
  signInAnonymously: () => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signInWithApple: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', { 
          event, 
          email: session?.user?.email,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN' && session) {
          // Create database session record
          try {
            const { data: dbSession, error: rpcError } = await supabase.rpc('create_user_session', {
              p_user_id: session.user.id,
              p_session_token: session.access_token,
              p_email: session.user.email || '',
              p_device_info: {
                userAgent: navigator.userAgent,
                platform: Capacitor.getPlatform(),
                timestamp: new Date().toISOString()
              }
            })
            
            if (rpcError) {
              console.error('[Auth] RPC error creating database session:', rpcError)
              // Continue without database session - don't block auth flow
            } else {
              setSessionToken(session.access_token)
              setSessionId(dbSession)
              
              console.log('[Auth] Database session created:', {
                userId: session.user.id,
                email: session.user.email,
                sessionId: dbSession
              })
            }
          } catch (error) {
            console.error('[Auth] Exception creating database session:', error)
            // Continue without database session - don't block auth flow
          }
        }
        
        if (event === 'SIGNED_OUT') {
          // End database session
          if (sessionToken) {
            try {
              await supabase.rpc('end_user_session', {
                p_session_token: sessionToken,
                p_reason: 'manual_signout'
              })
              
              console.log('[Auth] Database session ended:', {
                sessionToken: sessionToken.substring(0, 10) + '...',
                timestamp: new Date().toISOString()
              })
            } catch (error) {
              console.error('[Auth] Failed to end database session:', error)
            }
          }
          
          setSessionToken(null)
          setSessionId(null)
        }
        
        setLoading(false)
      }
    )

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session) {
        // Validate session exists in database
        const { data: isValid } = await supabase.rpc('validate_user_session', {
          p_session_token: session.access_token,
          p_user_id: session.user.id
        })
        
        if (!isValid) {
          console.warn('[Auth] Session not found in database, creating...')
          await supabase.rpc('create_user_session', {
            p_user_id: session.user.id,
            p_session_token: session.access_token,
            p_email: session.user.email || '',
            p_device_info: {
              userAgent: navigator.userAgent,
              platform: Capacitor.getPlatform(),
              timestamp: new Date().toISOString()
            }
          })
        }
        
        setSessionToken(session.access_token)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Error handled silently - no popup prompts

    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string, accountType: 'fan' | 'creator' | 'agency' | 'industry_resource' = 'fan') => {
    const redirectUrl = `${window.location.origin}/`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          account_type: accountType,
        },
      },
    })

    // Success/error handled silently - no popup prompts

    return { error }
  }

  const signOut = async () => {
    // Prevent re-entrant calls
    if (sessionStorage.getItem('signing_out') === 'true') {
      console.log('[SignOut] Already signing out, skipping')
      return { error: null }
    }
    
    sessionStorage.setItem('signing_out', 'true')
    const signOutId = `signout_${Date.now()}`
    
    try {
      console.log(`[SignOut:${signOutId}] Starting sign out process`)
      console.log(`[SignOut:${signOutId}] Current user:`, {
        email: user?.email,
        userId: user?.id
      })
      
      // STEP 1: End database session FIRST
      if (sessionToken) {
        console.log(`[SignOut:${signOutId}] Ending database session`)
        try {
          await supabase.rpc('end_user_session', {
            p_session_token: sessionToken,
            p_reason: 'manual_signout'
          })
          console.log(`[SignOut:${signOutId}] Database session ended successfully`)
        } catch (dbError) {
          console.error(`[SignOut:${signOutId}] Database session end failed:`, dbError)
          // Continue anyway - we still need to sign out
        }
      }
      
      // STEP 2: Clear native OAuth sessions
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        console.log(`[SignOut:${signOutId}] Clearing iOS OAuth sessions`)
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
          await GoogleAuth.signOut()
          console.log(`[SignOut:${signOutId}] Google sign out complete`)
        } catch (error) {
          console.log(`[SignOut:${signOutId}] Google sign out skipped:`, error)
        }
      }
      
      // STEP 3: Clear local storage
      console.log(`[SignOut:${signOutId}] Clearing local storage`)
      localStorage.removeItem('pending_account_type')
      
      // STEP 4: Clear local state BEFORE Supabase signout
      setSessionToken(null)
      setSessionId(null)
      
      // STEP 5: Sign out from Supabase (this triggers SIGNED_OUT event)
      console.log(`[SignOut:${signOutId}] Signing out from Supabase`)
      const { error } = await supabase.auth.signOut({
        scope: 'local' // Only clear local session
      })
      
      if (error) {
        console.error(`[SignOut:${signOutId}] Supabase sign out error:`, error)
        // Force clear local state anyway
        setUser(null)
        setSession(null)
      } else {
        console.log(`[SignOut:${signOutId}] Sign out successful`)
      }
      
      // STEP 6: Small delay to let auth state settle
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log(`[SignOut:${signOutId}] Complete`)
      return { error }
    } catch (error) {
      console.error(`[SignOut:${signOutId}] Caught error:`, error)
      
      // Force clear state on error
      setUser(null)
      setSession(null)
      setSessionToken(null)
      setSessionId(null)
      
      return { error }
    } finally {
      // Always clear the flag after a delay
      setTimeout(() => {
        sessionStorage.removeItem('signing_out')
      }, 1000)
    }
  }

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    // Success/error handled silently - no popup prompts

    return { error }
  }

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    })

    // Success/error handled silently - no popup prompts

    return { error }
  }

  const signInAnonymously = async (isRetry = false): Promise<{ error: any }> => {
    const requestId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Generate unique anonymous credentials
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const email = `guest-${timestamp}-${random}@temp.local`
      const password = `temp-${timestamp}-${random}`

      console.log(`[AuthProvider:ANON_SIGNUP:${requestId}]`, { email, isRetry })

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: 'Anonymous Guest',
            account_type: 'fan',
          },
        },
      })

      if (signUpError) {
        console.error(`[AuthProvider:ANON_SIGNUP_ERROR:${requestId}]`, {
          code: signUpError.code,
          message: signUpError.message,
          status: (signUpError as any).status
        })
        
        // If email already exists (rare), try again with new timestamp
        if (signUpError.message.includes('already registered')) {
          console.log(`[AuthProvider:ANON_RETRY:${requestId}] Email collision, retrying`)
          return await signInAnonymously(true)
        }
        
        // On first failure, retry once with backoff
        if (!isRetry) {
          console.log(`[AuthProvider:ANON_RETRY:${requestId}] Retrying after delay`)
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
          return await signInAnonymously(true)
        }
        
        return { error: signUpError }
      }

      console.log(`[AuthProvider:ANON_SIGNIN:${requestId}]`, { email })

      // Auto sign in the anonymous user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error(`[AuthProvider:ANON_SIGNIN_ERROR:${requestId}]`, {
          code: signInError.code,
          message: signInError.message
        })
      } else {
        console.log(`[AuthProvider:ANON_SUCCESS:${requestId}]`)
      }

      return { error: signInError }
    } catch (error: any) {
      console.error(`[AuthProvider:ANON_EXCEPTION:${requestId}]`, error)
      return { error }
    }
  }

  const signInWithGoogle = async (): Promise<{ error: any }> => {
    try {
      // Use native OAuth on iOS
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
        
        // Initialize Google Auth
        await GoogleAuth.initialize({
          clientId: '855084043919-hdr8naup9khbi2jor4qov171pvdjda7h.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
        })

        // Sign in with native Google
        const googleUser = await GoogleAuth.signIn()
        
        // Exchange Google token for Supabase session
        // Note: iOS doesn't support custom nonces, so "Skip nonce checks" must be enabled in Supabase
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.authentication.idToken,
        })
        
        return { error }
      }
      
      // Use web OAuth flow with popup
      return new Promise<{ error: any }>((resolve) => {
        console.log('Starting web OAuth popup flow')
        
        // Mobile-optimized popup dimensions
        const isMobileDevice = isMobile()
        const width = isMobileDevice ? Math.min(window.screen.width * 0.9, 500) : 600
        const height = isMobileDevice ? Math.min(window.screen.height * 0.9, 700) : 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        
        const popup = window.open(
          '',
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        )
        
        if (!popup) {
          console.error('Popup blocked by browser')
          resolve({ error: { message: 'Popup blocked. Please allow popups for this site and try again.' } })
          return
        }
        
        // Listen for message from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'oauth-success') {
            window.removeEventListener('message', handleMessage)
            resolve({ error: null })
          } else if (event.data.type === 'oauth-error') {
            window.removeEventListener('message', handleMessage)
            resolve({ error: { message: event.data.error } })
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Start OAuth flow in popup
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/oauth-callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        }).then(({ data }) => {
          if (data?.url && popup) {
            popup.location.href = data.url
          }
        })
        
        // Handle popup closed without completing
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            resolve({ error: { message: 'Sign-in cancelled' } })
          }
        }, 500)
      })
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      return { error }
    }
  }

  const signInWithApple = async (): Promise<{ error: any }> => {
    try {
      // Use native OAuth on iOS
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
        
        const result = await SignInWithApple.authorize({
          clientId: 'com.lovable.skipcreator',
          redirectURI: 'https://ytqkunjxhtjsbpdrwsjf.supabase.co/auth/v1/callback',
          scopes: 'email name',
          state: 'state',
        })
        
        // Exchange Apple token for Supabase session
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
        })
        
        return { error }
      }
      
      // Use web OAuth flow with popup
      return new Promise<{ error: any }>((resolve) => {
        // Open popup window
        const width = 600
        const height = 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        
        const popup = window.open(
          '',
          'apple-oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no`
        )
        
        if (!popup) {
          resolve({ error: { message: 'Popup blocked. Please allow popups for this site.' } })
          return
        }
        
        // Listen for message from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'oauth-success') {
            window.removeEventListener('message', handleMessage)
            resolve({ error: null })
          } else if (event.data.type === 'oauth-error') {
            window.removeEventListener('message', handleMessage)
            resolve({ error: { message: event.data.error } })
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Start OAuth flow in popup
        supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: `${window.location.origin}/oauth-callback`,
          },
        }).then(({ data }) => {
          if (data?.url && popup) {
            popup.location.href = data.url
          }
        })
        
        // Handle popup closed without completing
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            resolve({ error: { message: 'Sign-in cancelled' } })
          }
        }, 500)
      })
    } catch (error: any) {
      console.error('Apple sign-in error:', error)
      return { error }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    sessionToken,
    sessionId,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendConfirmation,
    signInAnonymously,
    signInWithGoogle,
    signInWithApple,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}