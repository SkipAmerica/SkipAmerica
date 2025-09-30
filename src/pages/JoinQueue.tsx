import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { BroadcastViewer } from '@/components/queue/BroadcastViewer';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';

interface Creator {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  category?: string;
  rating?: number;
}

interface LiveSession {
  id: string;
  creator_id: string;
  started_at: string;
}

export default function JoinQueue() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signInAnonymously } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const isUnloadingRef = useRef(false);

  // Stable cleanup function using useCallback
  const cleanupQueue = useCallback(async (reason: string = 'unknown') => {
    if (!user || !creatorId || !isInQueue || isUnloadingRef.current) return;
    
    console.log(`[JoinQueue] Cleanup triggered - reason: ${reason}`);
    
    try {
      await supabase
        .from('call_queue')
        .delete()
        .eq('creator_id', creatorId)
        .eq('fan_id', user.id);
      console.log('[JoinQueue] Queue cleanup completed for reason:', reason);
    } catch (error) {
      console.error('[JoinQueue] Error during queue cleanup:', error);
    }
  }, [user, creatorId, isInQueue]);

  // Auto-login anonymous user if not authenticated
  useEffect(() => {
    if (authLoading || autoLoginAttempted) return;

    if (!user) {
      setAutoLoginAttempted(true);
      setAutoLoginLoading(true);
      
      signInAnonymously()
        .then(({ error }) => {
          if (error) {
            console.error('Auto-login failed:', error);
            toast({
              title: "Connection Error",
              description: "Unable to connect to the service. Please refresh and try again.",
              variant: "destructive",
            });
          }
        })
        .finally(() => {
          setAutoLoginLoading(false);
        });
    }
  }, [user, authLoading, autoLoginAttempted, signInAnonymously, toast]);

  // Fetch creator info
  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;

      try {
        console.log('[JoinQueue] Looking up creator:', creatorId);
        
        // Query creators table directly (creators.id references profiles.id)
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select(`
            id,
            full_name,
            bio,
            avatar_url,
            categories,
            base_rate_min
          `)
          .eq('id', creatorId)
          .maybeSingle();

        if (creatorError) {
          console.error('[JoinQueue] Creator query error:', creatorError);
          throw creatorError;
        }

        if (!creatorData) {
          console.warn('[JoinQueue] Creator not found');
          toast({
            title: "Creator not found",
            description: "The creator you're looking for doesn't exist or may have been removed.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setCreator({
          id: creatorData.id,
          full_name: creatorData.full_name,
          bio: creatorData.bio || 'Creator Profile',
          avatar_url: creatorData.avatar_url,
          category: creatorData.categories?.[0] || 'General',
          rating: undefined // Will be calculated from appointments/reviews later
        });

      } catch (error) {
        console.error('[JoinQueue] Error fetching creator:', error);
        toast({
          title: "Error",
          description: "Failed to load creator information. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [creatorId, toast, navigate]);

  // Check if creator is live and get queue status
  useEffect(() => {
    if (!creatorId || !user) return;

    const checkLiveStatus = async () => {
      // Check if creator is currently live
      const { data: session } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('creator_id', creatorId)
        .is('ended_at', null)
        .single();

      setLiveSession(session);

      // Check if user is already in queue
      const { data: queueEntry } = await supabase
        .from('call_queue')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('fan_id', user.id)
        .eq('status', 'waiting')
        .single();

      if (queueEntry) {
        setIsInQueue(true);
        setDiscussionTopic(queueEntry.discussion_topic || '');
      }

      // Get total queue count
      const { count } = await supabase
        .from('call_queue')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'waiting');

      setQueueCount(count || 0);
    };

    checkLiveStatus();

    // Subscribe to queue changes
    const queueChannel = supabase
      .channel(`queue-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_queue',
          filter: `creator_id=eq.${creatorId}`
        },
        () => {
          checkLiveStatus();
        }
      )
      .subscribe();

    // Subscribe to live session changes
    const liveChannel = supabase
      .channel(`live-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `creator_id=eq.${creatorId}`
        },
        () => {
          checkLiveStatus();
        }
      )
      .subscribe();

    return () => {
      if ((window as any).__allow_ch_teardown) {
        try { supabase.removeChannel(queueChannel); } catch {}
        try { supabase.removeChannel(liveChannel); } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
    };
  }, [creatorId, user]);

  // Set initial display name from profile
  useEffect(() => {
    if (profile && !displayName) {
      setDisplayName(profile.full_name || 'Anonymous Guest');
    }
  }, [profile, displayName]);

  // Browser event cleanup and heartbeat system
  useEffect(() => {
    if (!user || !creatorId || !isInQueue) return;

    console.log('[JoinQueue] Setting up heartbeat and cleanup for user:', user.id, 'creator:', creatorId);

    // Heartbeat to update last_seen timestamp every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      try {
        const { error } = await supabase
          .from('call_queue')
          .update({ last_seen: new Date().toISOString() })
          .eq('creator_id', creatorId)
          .eq('fan_id', user.id);
        
        if (error) {
          console.error('[JoinQueue] Heartbeat update failed:', error);
        } else {
          console.log('[JoinQueue] Heartbeat updated successfully');
        }
      } catch (error) {
        console.error('[JoinQueue] Heartbeat update failed:', error);
      }
    }, 30000); // 30 seconds

    // Only cleanup on actual page unload, not tab switching
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('[JoinQueue] Page unloading - cleaning up queue');
      isUnloadingRef.current = true;
      
      // Use sendBeacon for reliable cleanup on page unload
      if (navigator.sendBeacon) {
        const payload = JSON.stringify({
          creator_id: creatorId,
          fan_id: user.id
        });
        navigator.sendBeacon('/api/cleanup-queue', payload);
      } else {
        // Synchronous cleanup for browsers without sendBeacon
        cleanupQueue('beforeunload');
      }
    };

    // More conservative visibility change handling
    let visibilityTimer: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Wait 5 seconds before cleanup to avoid accidental cleanups from tab switching
        visibilityTimer = setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            console.log('[JoinQueue] Page hidden for 5s - cleaning up queue');
            cleanupQueue('visibility-hidden');
          }
        }, 5000);
      } else {
        // Page became visible again, cancel any pending cleanup
        if (visibilityTimer) {
          console.log('[JoinQueue] Page visible again - canceling cleanup timer');
          clearTimeout(visibilityTimer);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on component unmount
    return () => {
      console.log('[JoinQueue] Component unmounting - cleaning up');
      clearInterval(heartbeatInterval);
      if (visibilityTimer) clearTimeout(visibilityTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Only cleanup if not already unloading
      if (!isUnloadingRef.current) {
        cleanupQueue('component-unmount');
      }
    };
  }, [user, creatorId, isInQueue]); // Removed cleanupQueue from dependencies

  const handleJoinQueue = async () => {
    if (!user || !creatorId || !displayName.trim()) return;

    setJoining(true);
    console.log('[JoinQueue] Attempting to join queue for creator:', creatorId, 'user:', user.id);
    
    try {
      // Update profile name first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: displayName.trim() })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Join the queue
      const { error } = await supabase
        .from('call_queue')
        .insert({
          creator_id: creatorId,
          fan_id: user.id,
          discussion_topic: discussionTopic || null,
          priority: 1, // Friends get priority
          status: 'waiting'
        });

      if (error) {
        if (error.code === '23505') {
          console.log('[JoinQueue] User already in queue');
          toast({
            title: "Already in queue",
            description: "You're already in this creator's queue.",
          });
          setIsInQueue(true); // Update state to reflect reality
        } else {
          throw error;
        }
      } else {
        console.log('[JoinQueue] Successfully joined queue');
        setIsInQueue(true);
        toast({
          title: "Joined queue!",
          description: "You're now first in line with priority access.",
        });
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      toast({
        title: "Error",
        description: "Failed to join queue. Please try again.",
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user || !creatorId) return;

    console.log('[JoinQueue] User manually leaving queue');
    
    try {
      const { error } = await supabase
        .from('call_queue')
        .delete()
        .eq('creator_id', creatorId)
        .eq('fan_id', user.id);

      if (error) throw error;

      setIsInQueue(false);
      setDiscussionTopic('');
      console.log('[JoinQueue] Successfully left queue');
      toast({
        title: "Left queue",
        description: "You've been removed from the queue.",
      });
    } catch (error) {
      console.error('Error leaving queue:', error);
      toast({
        title: "Error",
        description: "Failed to leave queue.",
        variant: "destructive"
      });
    }
  };

  if (authLoading || autoLoginLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">
            {autoLoginLoading ? 'Setting up your session...' : 'Loading creator information...'}
          </p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p>Creator not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (liveSession) {
      return <Badge variant="default" className="bg-red-500">🔴 Live Broadcasting</Badge>;
    }
    return <Badge variant="secondary">Offline</Badge>;
  };

  return (
    <div className="relative h-screen bg-black overflow-y-auto overflow-x-hidden pb-24">
      {/* Full-screen video broadcast */}
      <div className="absolute inset-0">
        <BroadcastViewer 
          creatorId={creatorId!} 
          sessionId={liveSession?.id || 'connecting'}
          isInQueue={isInQueue}
        />
      </div>

      {/* Creator info overlay - top left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
            <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-white text-sm">{creator.full_name}</h2>
            {creator.bio && (
              <p className="text-xs text-white/80 line-clamp-1 max-w-[200px]">{creator.bio}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {liveSession ? (
                <Badge className="bg-red-500 text-white text-xs h-5">🔴 LIVE</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs h-5">Offline</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Queue status - top right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10 text-center min-w-[80px]">
          <p className="text-xs text-white/70">In Queue</p>
          <p className="text-2xl font-bold text-white">{queueCount}</p>
        </div>
      </div>

      {/* Join queue form - bottom center (only when not in queue) */}
      {!isInQueue && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
          <Card className="bg-black/80 backdrop-blur-md border-white/10">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                maxLength={50}
              />
              
              <Textarea
                placeholder="Discussion topic (optional)"
                value={discussionTopic}
                onChange={(e) => setDiscussionTopic(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-20"
              />
              
              <Button
                onClick={handleJoinQueue}
                disabled={joining || !user || !displayName.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {joining ? "Joining..." : "Join Queue"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* In queue indicator - bottom center (only when in queue) */}
      {isInQueue && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-3 bg-green-500/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg">
            <span className="text-white font-semibold">🎉 You're in the queue!</span>
            <Button
              onClick={handleLeaveQueue}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-7"
            >
              Leave
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}