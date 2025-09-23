import { useState, useEffect } from 'react';
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
import { BroadcastViewer } from '@/components/queue/BroadcastViewer';
import { LobbyChat } from '@/components/queue/LobbyChat';
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
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  // Fetch creator info
  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;

      try {
        const { data, error } = await supabase
          .from('mock_creators')
          .select('*')
          .eq('id', creatorId)
          .maybeSingle();

        if (error) {
          toast({
            title: "Creator not found",
            description: "The creator you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setCreator(data);
      } catch (error) {
        console.error('Error fetching creator:', error);
        toast({
          title: "Error",
          description: "Failed to load creator information.",
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
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [creatorId, user]);

  const handleJoinQueue = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!creatorId) return;

    setJoining(true);
    try {
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
          toast({
            title: "Already in queue",
            description: "You're already in this creator's queue.",
          });
        } else {
          throw error;
        }
      } else {
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

    try {
      const { error } = await supabase
        .from('call_queue')
        .delete()
        .eq('creator_id', creatorId)
        .eq('fan_id', user.id);

      if (error) throw error;

      setIsInQueue(false);
      setDiscussionTopic('');
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Creator Info Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
                <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{creator.full_name}</h1>
                <p className="text-muted-foreground">{creator.bio}</p>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge()}
                  {creator.rating && (
                    <Badge variant="outline">⭐ {creator.rating}</Badge>
                  )}
                </div>
              </div>
            </div>

            {creator.category && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{creator.category}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Broadcast Viewer */}
          {liveSession && (
            <Card>
              <CardHeader>
                <CardTitle>🔴 Live Broadcast</CardTitle>
              </CardHeader>
              <CardContent>
                <BroadcastViewer 
                  creatorId={creatorId!} 
                  sessionId={liveSession.id}
                />
              </CardContent>
            </Card>
          )}

          {/* Queue Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">People in queue</p>
                <p className="text-3xl font-bold">{queueCount}</p>
              </div>

              {!isInQueue ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Discussion Topic (Optional)</label>
                    <Textarea
                      placeholder="What would you like to discuss?"
                      value={discussionTopic}
                      onChange={(e) => setDiscussionTopic(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button
                    onClick={handleJoinQueue}
                    disabled={joining}
                    className="w-full"
                    size="lg"
                  >
                    {joining ? "Joining..." : "Join Queue (Priority Access)"}
                  </Button>
                  
                  {!user && (
                    <p className="text-sm text-muted-foreground text-center">
                      You'll need to sign in to join the queue
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      🎉 You're in the queue!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      Priority access - First in line
                    </p>
                  </div>
                  
                  {discussionTopic && (
                    <div>
                      <p className="text-sm font-medium">Your topic:</p>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {discussionTopic}
                      </p>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleLeaveQueue}
                    variant="outline"
                    className="w-full"
                  >
                    Leave Queue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lobby Chat - Only show when user is in queue */}
        {isInQueue && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Lobby Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <LobbyChat creatorId={creatorId!} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}