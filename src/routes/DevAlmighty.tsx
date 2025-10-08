import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function DevAlmighty() {
  const [sessionId, setSessionId] = useState('dev-123')
  const [role, setRole] = useState<'creator' | 'user'>('creator')
  const navigate = useNavigate()

  const handleLaunch = () => {
    navigate(`/session/${sessionId}?role=${role}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🚀 Almighty Session Launcher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Session ID</label>
            <Input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="dev-123"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'creator' | 'user')}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="creator">Creator</option>
              <option value="user">User</option>
            </select>
          </div>

          <Button onClick={handleLaunch} className="w-full">
            Launch Almighty Session →
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
