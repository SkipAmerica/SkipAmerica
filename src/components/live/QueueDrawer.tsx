import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Clock, Phone } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/app/providers/auth-provider'

interface QueueEntry {
  id: string
  fan_id: string
  joined_at: string
  estimated_wait_minutes: number
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
}

interface QueueDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function QueueDrawer({ isOpen, onClose }: QueueDrawerProps) {
  const { user } = useAuth()
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !user) return

    const fetchQueue = async () => {
      setLoading(true)
      
      // First get queue entries
      const { data: queueData, error: queueError } = await supabase
        .from('call_queue')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })

      if (queueError) {
        console.error('Error fetching queue:', queueError)
        setLoading(false)
        return
      }

      // Then get profiles for each fan_id
      if (queueData && queueData.length > 0) {
        const fanIds = queueData.map(entry => entry.fan_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', fanIds)

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
        }

        // Combine queue data with profiles
        const enrichedEntries = queueData.map(entry => ({
          ...entry,
          profiles: profilesData?.find(profile => profile.id === entry.fan_id)
        }))

        setQueueEntries(enrichedEntries)
      } else {
        setQueueEntries([])
      }
      
      setLoading(false)
    }

    fetchQueue()
  }, [isOpen, user])

  const handleStartCall = async (queueEntry: QueueEntry) => {
    // Update queue entry status to 'in_call'
    await supabase
      .from('call_queue')
      .update({ status: 'in_call' })
      .eq('id', queueEntry.id)

    // Remove from local state
    setQueueEntries(prev => prev.filter(entry => entry.id !== queueEntry.id))
    
    // Here you would typically navigate to the call interface
    console.log('Starting call with:', queueEntry.profiles?.full_name)
  }

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Queue ({queueEntries.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : queueEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p>No one in queue yet</p>
              <p className="text-sm">Fans will appear here when they join</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {index + 1}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10">
                          {entry.profiles?.full_name 
                            ? getInitials(entry.profiles.full_name)
                            : 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <p className="font-medium">
                        {entry.profiles?.full_name || 'Anonymous User'}
                      </p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        Wait: {formatWaitTime(entry.estimated_wait_minutes)}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleStartCall(entry)}
                    className="bg-[hsl(var(--live-color))] hover:bg-[hsl(var(--live-color))]/90 text-white"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}