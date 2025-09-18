import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, DollarSign, Clock, Share2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";

interface LiveEventProps {
  eventId: string;
  onBack: () => void;
}

interface EventData {
  id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  total_price: number;
  host_creator_id: string;
  collaborators: Array<{
    creator_id: string;
    profit_share_percentage: number;
    role: string;
    profiles?: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
  registrations: Array<{
    user_id: string;
    amount_paid: number;
    profiles?: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
}

export function LiveEventInterface({ eventId, onBack }: LiveEventProps) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventData();
    const interval = setInterval(() => {
      if (isLive) {
        setDuration(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [eventId, isLive]);

  const loadEventData = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('collaborative_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      if (!eventData) throw new Error('Event not found');

      // Get collaborators
      const { data: collaborators } = await supabase
        .from('event_collaborators')
        .select(`
          creator_id,
          profit_share_percentage,
          role,
          profiles(full_name, avatar_url)
        `)
        .eq('event_id', eventId);

      // Get registrations
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select(`
          user_id,
          amount_paid,
          profiles(full_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('registration_status', 'confirmed');

      const eventWithDetails = {
        ...eventData,
        collaborators: collaborators || [],
        registrations: registrations || []
      };

      setEvent(eventWithDetails);
      setTotalRevenue((registrations || []).reduce((sum: number, reg: any) => sum + (reg.amount_paid || 0), 0));
      setParticipantCount((registrations || []).length);
    } catch (error) {
      console.error('Error loading event data:', error);
      toast.error("Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  const startEvent = () => {
    setIsLive(true);
    toast.success("Event is now live!");
  };

  const endEvent = async () => {
    setIsLive(false);
    
    // Update event status and distribute profits
    try {
      await supabase
        .from('collaborative_events')
        .update({ status: 'completed' })
        .eq('id', eventId);

      toast.success("Event ended. Profits will be distributed to collaborators.");
      onBack();
    } catch (error) {
      console.error('Error ending event:', error);
      toast.error("Failed to end event properly");
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateEarnings = (collaborator: any) => {
    return (totalRevenue * collaborator.profit_share_percentage / 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-8">
        <p>Event not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant={isLive ? "default" : "secondary"}>
                {isLive ? "LIVE" : "Ready to Start"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Duration: {formatDuration(duration)}
              </span>
            </div>
          </div>
          <Button onClick={onBack} variant="outline">
            Exit Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-3">
            <Card className="h-96 mb-4">
              <CardContent className="p-0 h-full bg-black rounded-lg flex items-center justify-center relative">
                <div className="text-white text-center">
                  <Video className="w-16 h-16 mx-auto mb-4" />
                  <p>Live Video Stream</p>
                  <p className="text-sm opacity-75">Collaborative Event in Progress</p>
                </div>
                
                {/* Collaborator Video Grid */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {event.collaborators.map((collaborator, index) => (
                    <div key={index} className="relative">
                      <div className="w-24 h-16 bg-gray-800 rounded border-2 border-white flex items-center justify-center">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={collaborator.profiles?.avatar_url} />
                          <AvatarFallback>
                            {collaborator.profiles?.full_name?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {collaborator.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => setIsAudioOn(!isAudioOn)}
                variant={isAudioOn ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-12 h-12"
              >
                {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              
              <Button
                onClick={() => setIsVideoOn(!isVideoOn)}
                variant={isVideoOn ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-12 h-12"
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              {!isLive ? (
                <Button onClick={startEvent} size="lg" className="px-8">
                  Start Event
                </Button>
              ) : (
                <Button onClick={endEvent} variant="destructive" size="lg" className="px-8">
                  End Event
                </Button>
              )}

              <Button variant="outline" size="lg" className="rounded-full w-12 h-12">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Event Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Participants</span>
                  </div>
                  <Badge>{participantCount}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Total Revenue</span>
                  </div>
                  <Badge variant="secondary">${totalRevenue}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <Badge variant="outline">{formatDuration(duration)}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Profit Sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profit Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.collaborators.map((collaborator, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={collaborator.profiles?.avatar_url} />
                        <AvatarFallback>
                          {collaborator.profiles?.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {collaborator.profiles?.full_name || 'Creator'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {collaborator.profit_share_percentage}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ${calculateEarnings(collaborator)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {event.registrations.map((registration, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={registration.profiles?.avatar_url} />
                        <AvatarFallback>
                          {registration.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {registration.profiles?.full_name || 'User'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}