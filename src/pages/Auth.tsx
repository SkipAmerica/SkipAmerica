import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const Auth = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

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