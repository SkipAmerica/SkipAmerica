import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QueueEntry {
  id: string;
  name: string;
  topic: string;
  waitTime: number;
  avatar?: string;
}

interface QueueDrawerContentProps {
  queueCount: number;
}

export const QueueDrawerContent: React.FC<QueueDrawerContentProps> = ({ queueCount }) => {
  const { toast } = useToast();

  // Mock data for now - replace with real data later
  const mockEntries: QueueEntry[] = Array.from({ length: queueCount }, (_, i) => ({
    id: `entry-${i}`,
    name: `User ${i + 1}`,
    topic: i === 0 ? 'Need help with my content strategy' : 
           i === 1 ? 'Want to discuss brand partnerships' : 
           'General consultation',
    waitTime: (i + 1) * 5,
  }));

  const handleStartCall = useCallback(async (entryId: string, userName: string) => {
    try {
      // Mock call start - implement real logic later
      toast({
        title: "Call Started",
        description: `Started call with ${userName}`,
      });
    } catch (err) {
      console.error('Failed to start call:', err);
      toast({
        title: "Error", 
        description: "Failed to start call. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (queueCount === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/80">No one in queue</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mockEntries.map((entry, index) => (
        <div key={entry.id} className="queue-drawer__item">
          <div className="queue-drawer__avatar">
            {entry.avatar ? (
              <img 
                src={entry.avatar} 
                alt={entry.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              getInitials(entry.name)
            )}
          </div>
          
          <div className="queue-drawer__info">
            <div className="queue-drawer__name">
              #{index + 1} {entry.name}
            </div>
            <div className="queue-drawer__topic">
              {entry.topic}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">
              {formatWaitTime(entry.waitTime)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStartCall(entry.id, entry.name)}
              className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs px-2 py-1"
            >
              Call
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};