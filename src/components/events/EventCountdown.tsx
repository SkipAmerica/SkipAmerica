import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  total_price: number;
  max_participants: number;
  host_creator_id: string;
  collaborators: Array<{
    creator_id: string;
    profit_share_percentage: number;
    role: string;
    profiles?: {
      full_name: string;
    };
  }>;
  registrations_count?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function EventCountdown() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [timeLeft, setTimeLeft] = useState<Record<string, TimeLeft>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from('collaborative_events')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (error) throw error;

      if (!eventsData) {
        setEvents([]);
        return;
      }

      // Get collaborators and registration counts for each event
      const eventsWithDetails = await Promise.all(
        eventsData.map(async (event) => {
          // Get collaborators
          const { data: collaborators } = await supabase
            .from('event_collaborators')
            .select(`
              creator_id,
              profit_share_percentage,
              role,
              profiles(full_name)
            `)
            .eq('event_id', event.id);

          // Get registration count
          const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('registration_status', 'confirmed');

          return {
            ...event,
            collaborators: collaborators || [],
            registrations_count: count || 0
          };
        })
      );

      setEvents(eventsWithDetails);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const updateCountdowns = () => {
    const now = new Date().getTime();
    const newTimeLeft: Record<string, TimeLeft> = {};

    events.forEach(event => {
      const eventTime = new Date(event.scheduled_at).getTime();
      const difference = eventTime - now;

      if (difference > 0) {
        newTimeLeft[event.id] = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        };
      }
    });

    setTimeLeft(newTimeLeft);
  };

  const registerForEvent = async (eventId: string, price: number) => {
    if (!user) {
      toast.error("Please login to register for events");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          amount_paid: price,
          registration_status: 'confirmed'
        });

      if (error) throw error;

      toast.success("Successfully registered for the event!");
      loadEvents(); // Refresh to update counts
    } catch (error) {
      console.error('Error registering for event:', error);
      toast.error("Failed to register for event");
    } finally {
      setLoading(false);
    }
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No upcoming collaborative events</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Upcoming Collaborative Events</h3>
      {events.map(event => {
        const countdown = timeLeft[event.id];
        const eventDate = new Date(event.scheduled_at);
        
        return (
          <Card key={event.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{event.title}</h4>
                      {event.description && (
                        <p className="text-muted-foreground mb-3">{event.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      ${event.total_price}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {eventDate.toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      {event.registrations_count}/{event.max_participants}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      {event.duration_minutes}min
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Collaborators:</p>
                    <div className="flex flex-wrap gap-2">
                      {event.collaborators.map((collaborator, index) => (
                        <Badge key={index} variant="outline">
                          {collaborator.profiles?.full_name || 'Creator'} 
                          {collaborator.role === 'host' && ' (Host)'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:w-80">
                  {countdown && (
                    <div className="bg-primary/5 rounded-lg p-4 mb-4">
                      <p className="text-center text-sm font-medium mb-2">Event Starts In:</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {countdown.days}
                          </div>
                          <div className="text-xs text-muted-foreground">Days</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {countdown.hours}
                          </div>
                          <div className="text-xs text-muted-foreground">Hours</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {countdown.minutes}
                          </div>
                          <div className="text-xs text-muted-foreground">Min</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {countdown.seconds}
                          </div>
                          <div className="text-xs text-muted-foreground">Sec</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => registerForEvent(event.id, event.total_price)}
                    disabled={loading || event.registrations_count >= event.max_participants}
                    className="w-full"
                  >
                    {event.registrations_count >= event.max_participants 
                      ? "Event Full" 
                      : loading 
                        ? "Registering..." 
                        : `Register - $${event.total_price}`
                    }
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}