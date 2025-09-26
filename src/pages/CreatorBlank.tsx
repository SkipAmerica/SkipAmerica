import { useAuth } from '@/app/providers/auth-provider'
import { Navigate } from 'react-router-dom'

export default function CreatorBlank() {
  const { user } = useAuth()
  
  // Simple creator guard
  const isCreator = user?.user_metadata?.account_type === 'creator' || user?.user_metadata?.role === 'creator'
  
  if (!isCreator) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Creator Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the creator area</p>
      </div>
    </div>
  )
}