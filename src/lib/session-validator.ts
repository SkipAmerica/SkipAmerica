import { supabase } from '@/integrations/supabase/client'
import type { User } from '@supabase/supabase-js'

export async function validateCurrentSession(): Promise<{
  valid: boolean
  user: User | null
  mismatch: boolean
  error?: string
}> {
  try {
    // Get current Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { valid: false, user: null, mismatch: false, error: 'No active session' }
    }
    
    // Validate against database
    const { data: isValid, error: dbError } = await supabase.rpc('validate_user_session', {
      p_session_token: session.access_token,
      p_user_id: session.user.id
    })
    
    if (dbError) {
      console.error('[SessionValidator] Database validation error:', dbError)
      return { valid: false, user: session.user, mismatch: false, error: 'Database error' }
    }
    
    if (!isValid) {
      console.warn('[SessionValidator] Session mismatch detected:', {
        userId: session.user.id,
        email: session.user.email,
        token: session.access_token.substring(0, 10) + '...'
      })
      
      return { valid: false, user: session.user, mismatch: true, error: 'Session not found in database' }
    }
    
    // Extra paranoia: Verify email matches profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, id')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile) {
      return { valid: false, user: session.user, mismatch: false, error: 'Profile not found' }
    }
    
    if (profile.email !== session.user.email) {
      console.error('[SessionValidator] EMAIL MISMATCH!', {
        authEmail: session.user.email,
        profileEmail: profile.email,
        userId: session.user.id
      })
      
      return { valid: false, user: session.user, mismatch: true, error: 'Email mismatch' }
    }
    
    return { valid: true, user: session.user, mismatch: false }
  } catch (error) {
    console.error('[SessionValidator] Unexpected error:', error)
    return { valid: false, user: null, mismatch: false, error: 'Validation failed' }
  }
}

// Use in AuthGuard or as middleware
export async function enforceSessionValidity() {
  const result = await validateCurrentSession()
  
  if (!result.valid) {
    console.error('[SessionValidator] Invalid session detected, forcing sign out')
    
    // Force sign out
    await supabase.auth.signOut()
    
    // Redirect to auth
    window.location.href = '/auth?error=session_invalid'
    
    return false
  }
  
  return true
}
