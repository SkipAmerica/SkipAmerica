import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingSpinner } from '@/shared/ui/loading-spinner'

const OAuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('OAuth callback error:', error)
          
      // If we're in a popup, notify parent and close
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-error', error: error.message }, window.location.origin)
        window.close()
        return
      }
          
          navigate('/auth')
          return
        }

        if (session) {
          // Check for pending account type from OAuth flow
          const pendingAccountType = localStorage.getItem('pending_account_type') as 'creator' | 'fan' | null
          
          if (pendingAccountType) {
            console.log('Found pending account type:', pendingAccountType)
            
            // Update profile with correct account type
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ account_type: pendingAccountType })
              .eq('id', session.user.id)
            
            if (profileError) {
              console.error('Error updating profile account type:', profileError)
            } else {
              console.log('Profile account type updated to:', pendingAccountType)
            }
            
            // If creator, initialize creator record
            if (pendingAccountType === 'creator') {
              // Check if creator record exists
              const { data: existingCreator } = await supabase
                .from('creators')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle()
              
              if (!existingCreator) {
                console.log('Creating creator record...')
                const { error: creatorError } = await supabase
                  .from('creators')
                  .insert({
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Creator',
                    avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
                  })
                
                if (creatorError) {
                  console.error('Error creating creator record:', creatorError)
                } else {
                  console.log('Creator record created successfully')
                }
              }
            }
            
            // Clean up
            localStorage.removeItem('pending_account_type')
          }
          
    // If in popup, notify parent and close
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth-success' }, window.location.origin)
      window.close()
      return
    }
          
          // Otherwise navigate to auth page, which will handle routing
          navigate('/auth')
        } else {
          // If in popup, close it
          if (window.opener) {
            window.close()
            return
          }
          navigate('/auth')
        }
      } catch (error) {
        console.error('Unexpected error in OAuth callback:', error)
        
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-error', error: 'Unexpected error' }, window.location.origin)
        window.close()
        return
      }
        
        navigate('/auth')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="fixed inset-0 bg-gradient-splash flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-white/90">Completing sign in...</p>
      </div>
    </div>
  )
}

export default OAuthCallback
