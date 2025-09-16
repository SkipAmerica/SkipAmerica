import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MessageCircle, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ReschedulingChat } from './ReschedulingChat';

interface Appointment {
  id: string;
  creator_id: string;
  fan_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  amount: number;
  creator_name?: string;
  fan_name?: string;
}

export function AppointmentManager() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showRescheduleChat, setShowRescheduleChat] = useState(false);

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load appointments where user is either creator or fan
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_creator_id_fkey(full_name),
          profiles!appointments_fan_id_fkey(full_name)
        `)
        .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Transform data to include names
      const transformedData = data?.map(apt => ({
        ...apt,
        creator_name: apt.profiles?.full_name || 'Unknown Creator',
        fan_name: apt.profiles?.full_name || 'Unknown Fan'
      })) || [];

      setAppointments(transformedData);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string, cancellationReason?: string) => {
    try {
      const updateData: any = { 
        status,
        cancelled_by: user?.id
      };
      
      if (cancellationReason) {
        updateData.cancellation_reason = cancellationReason;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(`Appointment ${status} successfully`);
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'rescheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'rescheduled': return <Clock className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const filterAppointments = (status?: string) => {
    if (!status) return appointments;
    return appointments.filter(apt => apt.status === status);
  };

  const isCreator = (appointment: Appointment) => appointment.creator_id === user?.id;

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card key={appointment.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium">
              {isCreator(appointment) ? appointment.fan_name : appointment.creator_name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {isCreator(appointment) ? 'Appointment with fan' : 'Appointment with creator'}
            </p>
          </div>
          <Badge className={getStatusColor(appointment.status)} variant="secondary">
            <div className="flex items-center space-x-1">
              {getStatusIcon(appointment.status)}
              <span className="capitalize">{appointment.status}</span>
            </div>
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(appointment.scheduled_at), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(appointment.scheduled_at), 'h:mm a')} ({appointment.duration_minutes} min)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">${appointment.amount}</span>
          </div>
        </div>

        {appointment.status === 'scheduled' && (
          <div className="flex space-x-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedAppointment(appointment);
                setShowRescheduleChat(true);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled', 'Cancelled by user')}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-6">Loading appointments...</div>;
  }

  if (showRescheduleChat && selectedAppointment) {
    return (
      <ReschedulingChat
        appointment={selectedAppointment}
        onClose={() => {
          setShowRescheduleChat(false);
          setSelectedAppointment(null);
          loadAppointments();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Appointments</h2>
        <p className="text-muted-foreground">Manage your scheduled appointments</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All ({appointments.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({filterAppointments('scheduled').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filterAppointments('completed').length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({filterAppointments('cancelled').length})</TabsTrigger>
          <TabsTrigger value="rescheduled">Rescheduled ({filterAppointments('rescheduled').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {appointments.length > 0 ? (
            appointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No appointments found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          {filterAppointments('scheduled').map(appointment => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filterAppointments('completed').map(appointment => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          {filterAppointments('cancelled').map(appointment => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>

        <TabsContent value="rescheduled" className="mt-6">
          {filterAppointments('rescheduled').map(appointment => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}