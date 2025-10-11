import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function DevAlmighty() {
  const [role, setRole] = useState<'creator' | 'user'>('creator')
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLaunch = async () => {
    try {
      const { data: newSessionId, error } = await supabase.rpc('create_dev_session');
      
      if (error) {
        console.error('[DevAlmighty] RPC error:', error);
        toast({
          title: 'Failed to create dev session',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }
      
      if (!newSessionId) {
        toast({
          title: 'No session ID returned',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('[DevAlmighty] Created dev session:', newSessionId);
      navigate(`/session/${newSessionId}?role=${role}`);
    } catch (err) {
      console.error('[DevAlmighty] Launch error:', err);
      toast({
        title: 'Launch failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🚀 Almighty Session Launcher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
