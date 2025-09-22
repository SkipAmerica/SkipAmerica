import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Clock, DollarSign, Phone, Grip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLive } from '@/hooks/live';
import { LiveErrorBoundary } from './LiveErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';

interface QueueEntry {
  id: string
  fan_id: string
  joined_at: string
  estimated_wait_minutes: number
  topic?: string
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
}

const LiveControlBarContent: React.FC = () => {
  // Always call all hooks unconditionally at the top level
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  
  const shellRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const live = useLive();
  
  // Safely access live store values
  const isLive = live?.isLive || false;
  const isDiscoverable = live?.isDiscoverable || false;
  const state = live?.state || 'OFFLINE';
  const queueCount = live?.queueCount || 0;
  
  // Show DSB when discoverable but not in active call
  const shouldShowDSB = isDiscoverable && !isLive;

  // Hydration guard to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100); // Small delay to ensure bottom nav is rendered first
    return () => clearTimeout(timer);
  }, []);

  // Fetch queue entries
  const fetchQueue = useCallback(async () => {
    if (!user || !shouldShowDSB) return;
    
    setQueueLoading(true);
    try {
      const { data: queueData, error: queueError } = await supabase
        .from('call_queue')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true });

      if (queueError) throw queueError;

      // Get profiles for each fan_id
      let enrichedEntries: QueueEntry[] = [];
      if (queueData?.length > 0) {
        const fanIds = queueData.map(entry => entry.fan_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', fanIds);

        enrichedEntries = queueData.map(entry => ({
          ...entry,
          topic: (entry as any).topic || 'General discussion',
          profiles: profilesData?.find(profile => profile.id === entry.fan_id)
        }));
      }

      setQueueEntries(enrichedEntries);
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setQueueLoading(false);
    }
  }, [user, shouldShowDSB]);

  useEffect(() => {
    if (isQueueOpen) {
      fetchQueue();
    }
  }, [isQueueOpen, fetchQueue]);

  const handleQueueClick = useCallback(() => {
    setIsQueueOpen(!isQueueOpen);
  }, [isQueueOpen]);

  // Drag handlers for strip
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isQueueOpen) return; // Only drag when collapsed
    setIsDragging(true);
    startYRef.current = e.clientY;
    setDragY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isQueueOpen]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.clientY;
    const clampedDelta = Math.max(0, Math.min(deltaY, window.innerHeight * 0.8));
    setDragY(clampedDelta);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = window.innerHeight * 0.15; // 15% of screen height
    if (dragY > threshold) {
      setIsQueueOpen(true);
    }
    setDragY(0);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [isDragging, dragY]);

  const handleStartCall = useCallback(async (queueEntry: QueueEntry) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('call_queue')
        .update({ status: 'in_call' })
        .eq('id', queueEntry.id);

      if (error) throw error;

      setQueueEntries(prev => prev.filter(entry => entry.id !== queueEntry.id));
      
      toast({
        title: "Call Started",
        description: `Connected with ${queueEntry.profiles?.full_name || 'user'}`,
      });
      
      setIsQueueOpen(false);
    } catch (error: any) {
      toast({
        title: "Call Failed", 
        description: error.message || "Failed to start call. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, toast]);
  // Handle visibility states for show/hide
  useEffect(() => {
    if (shouldShowDSB && !isVisible) {
      setIsVisible(true);
    } else if (!shouldShowDSB && isVisible) {
      setIsVisible(false);
      setIsQueueOpen(false); // Close drawer when hiding DSB
    }
  }, [shouldShowDSB, isVisible]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!shouldShowDSB || !isHydrated) {
    return null;
  }
  return (
    <div ref={shellRef} className="dsb-shell" data-hydrated={isHydrated}>
      {/* Collapsed Strip (Grabbable Handle) */}
      {!isQueueOpen && (
        <div 
          className={cn(
            "dsb-strip",
            isVisible && "dsb-strip--visible"
          )}
          style={{
            transform: isDragging ? `translateY(${-dragY}px)` : undefined
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="button"
          aria-label="Drag to open queue or tap to toggle"
          tabIndex={0}
          onClick={(e) => {
            if (!isDragging) {
              handleQueueClick();
            }
          }}
        >
          <div className="flex items-center justify-center h-full">
            <Grip className="w-4 h-4 text-white/60" />
          </div>
        </div>
      )}

      {/* Expanded Drawer */}
      <div 
        ref={drawerRef}
        className={cn(
          "dsb-drawer",
          isQueueOpen && "dsb-drawer--open"
        )}
        role="dialog"
        aria-expanded={isQueueOpen}
        aria-label="Queue drawer"
      >
        {/* Drawer Handle */}
        <div 
          className="dsb-drawer-handle"
          onClick={() => setIsQueueOpen(false)}
          role="button"
          aria-label="Close queue drawer"
          tabIndex={0}
        />

        {/* Drawer Content */}
        <div className="dsb-drawer-content">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Queue ({queueEntries.length})</h2>
            </div>
            <Button
              onClick={handleQueueClick}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Users size={16} />
              <span className="ml-2">{queueEntries.length}</span>
            </Button>
          </div>

          {/* Queue Entries */}
          {queueLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : queueEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-60">
              <Users className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium mb-2">No one in queue yet</p>
              <p className="text-sm">Fans will appear here when they join</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueEntries.map((entry, index) => (
                <div key={entry.id} className="dsb-queue-entry">
                  <div className="dsb-queue-avatar">
                    {entry.profiles?.full_name 
                      ? getInitials(entry.profiles.full_name)
                      : 'U'
                    }
                  </div>
                  <div className="dsb-queue-info">
                    <div className="dsb-queue-name">
                      {entry.profiles?.full_name || 'Anonymous User'}
                    </div>
                    <div className="dsb-queue-topic">
                      Topic: {entry.topic || 'General discussion'}
                    </div>
                  </div>
                  <div className="dsb-queue-actions">
                    <Button
                      size="sm"
                      onClick={() => handleStartCall(entry)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const LiveControlBar: React.FC = () => (
  <LiveErrorBoundary>
    <LiveControlBarContent />
  </LiveErrorBoundary>
)