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
            window.opener.postMessage({ type: 'oauth-error', error: error.message }, '*')
            window.close()
            return
          }
          
          navigate('/auth')
          return
        }

        if (session) {
          // If we're in a popup, notify parent and close
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth-success', session }, '*')
            setTimeout(() => window.close(), 500)
            return
          }
          
          // Otherwise navigate normally
          navigate('/')
        } else {
          navigate('/auth')
        }
      } catch (error) {
        console.error('Unexpected error in OAuth callback:', error)
        
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-error', error: 'Unexpected error' }, '*')
          window.close()
          return
        }
        
        navigate('/auth')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}

export default OAuthCallback
