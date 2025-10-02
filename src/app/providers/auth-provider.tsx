// Centralized authentication provider
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { Capacitor } from '@capacitor/core'
import { isIOS } from '@/shared/lib/platform'

interface AuthContextType {
  user: User | null
  session: Session | null
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle auth events - removed popup prompts
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
    const { error } = await supabase.auth.signOut()

    // Error handled silently - no popup prompts

    return { error }
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

  const signInAnonymously = async () => {
    try {
      // Generate unique anonymous credentials
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const email = `guest-${timestamp}-${random}@temp.local`
      const password = `temp-${timestamp}-${random}`

      const { error } = await supabase.auth.signUp({
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

      if (error) {
        // If email already exists (rare), try again with new timestamp
        if (error.message.includes('already registered')) {
          return await signInAnonymously()
        }
        return { error }
      }

      // Auto sign in the anonymous user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { error: signInError }
    } catch (error) {
      return { error }
    }
  }

  const signInWithGoogle = async () => {
    try {
      // Use native OAuth on iOS
      if (Capacitor.isNativePlatform() && isIOS()) {
        // Dynamic import to avoid loading on web
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
        
        // Initialize Google Auth
        await GoogleAuth.initialize({
          clientId: '855084043919-raeo01iosieret7dtlcdd7bmg9i69ena.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
        })

        // Sign in with native Google
        const googleUser = await GoogleAuth.signIn()
        
        // Exchange Google token for Supabase session
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.authentication.idToken,
        })
        
        return { error }
      }
      
      // Use web OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      return { error }
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      return { error }
    }
  }

  const signInWithApple = async () => {
    try {
      // Use native OAuth on iOS
      if (Capacitor.isNativePlatform() && isIOS()) {
        // Dynamic import to avoid loading on web
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
      
      // Use web OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      return { error }
    } catch (error: any) {
      console.error('Apple sign-in error:', error)
      return { error }
    }
  }

  const value: AuthContextType = {
    user,
    session,
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