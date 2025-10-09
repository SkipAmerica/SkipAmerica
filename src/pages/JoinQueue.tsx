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
import { useCreatorPresence } from '@/shared/hooks';
import { QueueChat } from '@/components/queue/QueueChat';
import { NextUpConsentModal } from '@/components/queue/NextUpConsentModal';
import { z } from 'zod';

const displayNameSchema = z.string()
  .trim()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[^\x00-\x1F\x7F]+$/, 'Name contains invalid characters');

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
  
  // URL flag to force broadcasting for testing (bypass consent)
  const forceBroadcast = new URLSearchParams(window.location.search).get('broadcast') === '1';
  
  // Use centralized presence hook for online status
  const { isOnline } = useCreatorPresence(creatorId || null);

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
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsentedToBroadcast, setHasConsentedToBroadcast] = useState(false);
  const [actualPosition, setActualPosition] = useState<number | null>(null);
  const [consentStream, setConsentStream] = useState<MediaStream | undefined>(undefined);

  const isUnloadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const userEditedNameRef = useRef(false);
  const initialNameSetRef = useRef(false);

  // Ensure full-viewport scrolling on PQ
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById('root');

    htmlEl.classList.add('pq-scroll');
    bodyEl.classList.add('pq-scroll');
    rootEl?.classList.add('pq-scroll-root');

    // Mark scroll container for hooks that look it up
    bodyEl.setAttribute('data-scroll-container', 'true');

    return () => {
      htmlEl.classList.remove('pq-scroll');
      bodyEl.classList.remove('pq-scroll');
      rootEl?.classList.remove('pq-scroll-root');
      bodyEl.removeAttribute('data-scroll-container');
    };
  }, []);

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
            base_rate_min,
            is_online
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

        // Note: Online status now managed by useCreatorPresence hook

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
  const checkLiveStatus = useCallback(async () => {
    if (!creatorId || !user) return;
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

      // Get total queue count and calculate this user's position
      const { data: allQueueEntries } = await supabase
        .from('call_queue')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true });

      const count = allQueueEntries?.length || 0;
      setQueueCount(count);

      // Calculate user's position (1-indexed)
      if (queueEntry && allQueueEntries) {
        const position = allQueueEntries.findIndex(entry => entry.id === queueEntry.id) + 1;
        setActualPosition(position);
        console.log('[JoinQueue] User position in queue:', position);
        
        // Show consent modal when user becomes "Next Up" (position 1)
        if (position === 1 && !hasConsentedToBroadcast && !forceBroadcast) {
          console.log('[JoinQueue] 🎯 User is next up, showing consent modal');
          setShowConsentModal(true);
        }
      } else {
        setActualPosition(null);
      }
  }, [creatorId, user, hasConsentedToBroadcast, forceBroadcast]);

  // Subscribe to live status and queue changes
  useEffect(() => {
    if (!creatorId || !user) return;

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

    // Note: Presence subscription now handled by useCreatorPresence hook

    return () => {
      if ((window as any).__allow_ch_teardown) {
        try { supabase.removeChannel(queueChannel); } catch {}
        try { supabase.removeChannel(liveChannel); } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
    };
  }, [creatorId, user, checkLiveStatus]);

  // Set initial display name from profile (only once, and never overwrite user edits)
  useEffect(() => {
    if (initialNameSetRef.current || userEditedNameRef.current || !profile) return;
    
    // For anonymous users or users with "Anonymous Guest" as name, leave blank for them to fill
    if (profile.full_name && profile.full_name !== 'Anonymous Guest') {
      setDisplayName(profile.full_name);
    }
    initialNameSetRef.current = true;
  }, [profile]);

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
      console.log('[JoinQueue] beforeunload - cleaning up queue');
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

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on effect teardown (NOT component unmount)
    return () => {
      console.log('[JoinQueue] Effect cleanup - clearing timers and listeners only');
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up consent stream tracks
      if (consentStream) {
        console.log('[JoinQueue] Stopping consent stream tracks');
        consentStream.getTracks().forEach(track => track.stop());
      }
      // NOTE: Do NOT call cleanupQueue here - it fires when consentStream changes
    };
  }, [user, creatorId, isInQueue]); // Removed consentStream from deps

  // Separate unmount-only cleanup using refs
  useEffect(() => {
    const userIdRef = { current: user?.id };
    const creatorIdRef = { current: creatorId };
    const isInQueueRef = { current: isInQueue };

    // Update refs on every render
    userIdRef.current = user?.id;
    creatorIdRef.current = creatorId;
    isInQueueRef.current = isInQueue;

    // This cleanup only runs on true component unmount
    return () => {
      console.log('[JoinQueue] Component unmount - final cleanup check');
      // Only cleanup if not already unloading and still in queue
      if (!isUnloadingRef.current && isInQueueRef.current && userIdRef.current && creatorIdRef.current) {
        console.log('[JoinQueue] Component unmount - removing from queue');
        cleanupQueue('component-unmount-final');
      }
    };
  }, []); // Empty deps = runs cleanup only on unmount

  const handleJoinQueue = async () => {
    if (!user || !creatorId || !displayName.trim()) return;

    // Validate display name
    const validation = displayNameSchema.safeParse(displayName);
    if (!validation.success) {
      toast({
        title: "Invalid name",
        description: validation.error.issues[0].message,
        variant: "destructive"
      });
      return;
    }

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
        checkLiveStatus();
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
      setHasConsentedToBroadcast(false); // Reset consent
      setActualPosition(null);
      
      // Clean up consent stream
      if (consentStream) {
        consentStream.getTracks().forEach(track => track.stop());
        setConsentStream(undefined);
      }
      
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

  const handleConsentAgree = async () => {
    console.log('[JoinQueue] Fan consented to broadcast');
    
    // Capture media stream to use for publishing
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('[JoinQueue] ✅ Media stream captured for broadcasting');
      setConsentStream(stream);
    } catch (err) {
      console.error('[JoinQueue] ❌ Failed to capture media stream:', err);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access to broadcast your video.",
        variant: "destructive"
      });
      return;
    }
    
    setHasConsentedToBroadcast(true);
    setShowConsentModal(false);
    toast({
      title: "Broadcasting Started",
      description: `${creator?.full_name} can now see your video preview.`,
    });
  };

  const handleConsentDecline = () => {
    console.log('[JoinQueue] Fan declined broadcast consent');
    setShowConsentModal(false);
    toast({
      title: "Not Ready",
      description: "You can agree when you're ready. You'll keep your position in line.",
      variant: "default"
    });
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
    <div className="min-h-screen bg-background pb-safe pb-20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Creator info header */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4 bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-border">
                <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
                <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg">{creator.full_name}</h2>
                {creator.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{creator.bio}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {liveSession ? (
                    <Badge className="bg-red-500 text-white">🔴 LIVE</Badge>
                  ) : isOnline ? (
                    <Badge className="bg-green-500 text-white">🟢 Online</Badge>
                  ) : (
                    <Badge variant="secondary">Offline</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Queue status */}
            <div className="text-right">
              <div className="text-sm">
                <p className="font-semibold mb-1">Queue Status</p>
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{queueCount}</span>
                  <span className="text-muted-foreground">people waiting</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video section - takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="h-[300px] sm:h-[400px] bg-black rounded-lg overflow-hidden border">
              <BroadcastViewer 
                creatorId={creatorId!} 
                sessionId={liveSession?.id || 'connecting'}
                isInQueue={isInQueue}
                shouldPublishFanVideo={isInQueue && (hasConsentedToBroadcast || forceBroadcast)}
                consentStream={consentStream}
              />
            </div>
          </div>

          {/* Join/Leave queue card - takes 1/3 on large screens */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isInQueue ? 'In Queue' : 'Join the Queue'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!isInQueue ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Your Name
                      </label>
                      <Input
                        ref={inputRef}
                        placeholder="Enter your name"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          userEditedNameRef.current = true;
                        }}
                        onFocus={() => {
                          userEditedNameRef.current = true;
                        }}
                        autoComplete="name"
                        name="displayName"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Discussion topic (optional)
                      </label>
                      <Textarea
                        placeholder="e.g., Career advice..."
                        value={discussionTopic}
                        onChange={(e) => setDiscussionTopic(e.target.value)}
                        className="min-h-[50px] resize-none text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleJoinQueue}
                      disabled={joining || !displayName.trim()}
                      className="w-full h-9"
                    >
                      {joining ? 'Joining...' : 'Join Queue'}
                    </Button>
                  </div>
                 ) : (
                  <div className="space-y-2.5">
                    <div className="text-center">
                      <div className="text-2xl mb-1">✅</div>
                      <p className="font-medium text-sm mb-1">You're in queue!</p>
                      {actualPosition !== null && (
                        <div className="mb-2">
                          {actualPosition === 1 ? (
                            <Badge className="bg-primary text-primary-foreground">
                              🎯 You're Next Up!
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Position: {actualPosition}
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {actualPosition === 1 
                          ? hasConsentedToBroadcast 
                            ? "Broadcasting to creator - wait for them to start your call"
                            : "Click 'I Agree' when ready to start broadcasting"
                          : "The creator will connect with you soon"
                        }
                      </p>
                      {discussionTopic && (
                        <div className="mt-2 p-2 bg-muted rounded border">
                          <p className="text-xs text-muted-foreground mb-0.5">Your topic:</p>
                          <p className="text-xs">{discussionTopic}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleLeaveQueue}
                      variant="outline"
                      className="w-full h-9"
                    >
                      Leave Queue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chat section below video */}
        {user && (
          <div className="mt-6">
            <QueueChat 
              creatorId={creatorId!}
              fanId={user.id}
              isInQueue={isInQueue}
            />
          </div>
        )}
      </div>

      {/* Next Up Consent Modal */}
      <NextUpConsentModal
        isOpen={showConsentModal}
        onAgree={handleConsentAgree}
        onDecline={handleConsentDecline}
        creatorName={creator?.full_name || 'Creator'}
        creatorTerms={undefined} // TODO: Add creator terms from database
      />
    </div>
  );
}