// Centralized authentication provider
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

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