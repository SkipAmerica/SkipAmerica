import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Clock, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/providers/auth-provider';
import { toast } from 'sonner';
import { format, addDays, startOfDay, isAfter, isBefore, addMinutes } from 'date-fns';

interface Creator {
  id: string;
  name: string;
  rate: number;
  rating: number;
  reliability_score: number;
}

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AppointmentBookingProps {
  creator: Creator;
  onBook: (appointmentId: string) => void;
  onClose: () => void;
}

export function AppointmentBooking({ creator, onBook, onClose }: AppointmentBookingProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [creatorAvailability, setCreatorAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    loadCreatorAvailability();
  }, [creator.id]);

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots();
    }
  }, [selectedDate, creatorAvailability, bookedSlots]);

  const loadCreatorAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_availability')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('is_active', true);

      if (error) throw error;
      setCreatorAvailability(data || []);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  };

  const loadBookedSlots = async (date: Date) => {
    try {
      const startOfSelectedDay = startOfDay(date);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);

      const { data, error } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .eq('creator_id', creator.id)
        .gte('scheduled_at', startOfSelectedDay.toISOString())
        .lt('scheduled_at', endOfSelectedDay.toISOString())
        .in('status', ['scheduled', 'rescheduled']);

      if (error) throw error;
      
      const booked = data?.map(apt => format(new Date(apt.scheduled_at), 'HH:mm')) || [];
      setBookedSlots(booked);
    } catch (error) {
      console.error('Error loading booked slots:', error);
    }
  };

  const generateTimeSlots = async () => {
    if (!selectedDate) return;

    await loadBookedSlots(selectedDate);
    
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = creatorAvailability.filter(slot => slot.day_of_week === dayOfWeek);
    
    const slots: TimeSlot[] = [];
    
    dayAvailability.forEach(availability => {
      const [startHour, startMinute] = availability.start_time.split(':').map(Number);
      const [endHour, endMinute] = availability.end_time.split(':').map(Number);
      
      let currentTime = new Date(selectedDate);
      currentTime.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(selectedDate);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      while (isBefore(currentTime, endTime)) {
        const timeString = format(currentTime, 'HH:mm');
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
        
        // Check if slot is in the future and not booked
        const isAvailable = isAfter(slotDateTime, new Date()) && !bookedSlots.includes(timeString);
        
        slots.push({
          time: timeString,
          available: isAvailable
        });
        
        currentTime = addMinutes(currentTime, 30); // 30-minute slots
      }
    });
    
    setAvailableSlots(slots);
    setSelectedTime('');
  };

  const bookAppointment = async () => {
    if (!user || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          creator_id: creator.id,
          fan_id: user.id,
          scheduled_at: appointmentDateTime.toISOString(),
          duration_minutes: 30,
          amount: creator.rate
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Appointment booked successfully!');
      onBook(data.id);
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const canSelectDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const hasAvailability = creatorAvailability.some(slot => slot.day_of_week === dayOfWeek);
    return isAfter(date, new Date()) && hasAvailability;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Book Appointment with {creator.name}</span>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>${creator.rate}/30min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{creator.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4" />
            <span>{creator.reliability_score.toFixed(0)}% reliable</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">Select Date</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => !canSelectDate(date)}
            className="rounded-md border"
          />
        </div>

        {selectedDate && (
          <div>
            <h3 className="font-medium mb-3">
              Available Times - {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className="text-sm"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No available time slots for this date.</p>
            )}
          </div>
        )}

        {selectedTime && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Booking Summary</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Date:</strong> {format(selectedDate!, 'EEEE, MMMM d, yyyy')}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              <p><strong>Duration:</strong> 30 minutes</p>
              <p><strong>Cost:</strong> ${creator.rate}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={bookAppointment} 
            disabled={!selectedTime || loading}
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}