import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Repeat, 
  Globe,
  Plus,
  Settings,
  AlertCircle,
  CheckCircle,
  UserPlus
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns';
import { StripeCheckout } from '@/components/payments/StripeCheckout';

interface TimeSlot {
  time: string;
  available: boolean;
  price?: number;
}

interface SchedulingProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  callRate?: number;
  onBookingComplete?: () => void;
}

const timeZones = [
  'UTC',
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const durations = [
  { value: 15, label: '15 minutes', price: 0.25 },
  { value: 30, label: '30 minutes', price: 0.5 },
  { value: 45, label: '45 minutes', price: 0.75 },
  { value: 60, label: '1 hour', price: 1 },
  { value: 90, label: '1.5 hours', price: 1.5 },
  { value: 120, label: '2 hours', price: 2 }
];

const repeatOptions = [
  { value: 'none', label: 'No repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' }
];

export function AdvancedScheduler({ 
  creatorId, 
  creatorName, 
  creatorAvatar, 
  callRate = 50,
  onBookingComplete 
}: SchedulingProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [timeZone, setTimeZone] = useState<string>('UTC');
  const [repeatType, setRepeatType] = useState<string>('none');
  const [notes, setNotes] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  
  const generateTimeSlots = (date: Date) => {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute of [0, 30]) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isAvailable = Math.random() > 0.3; // Mock availability
        const priceMultiplier = hour < 12 || hour > 15 ? 1 : 1.2; // Peak hours cost more
        
        slots.push({
          time,
          available: isAvailable,
          price: callRate * priceMultiplier
        });
      }
    }
    return slots;
  };

  useEffect(() => {
    if (selectedDate) {
      setAvailableSlots(generateTimeSlots(selectedDate));
    }
  }, [selectedDate, callRate]);

  useEffect(() => {
    // Auto-detect user's timezone
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZones.includes(detectedTimeZone)) {
      setTimeZone(detectedTimeZone);
    }
  }, []);

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please log in to book a session');
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }

    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes);

    setShowPayment(true);
  };

  const joinWaitlist = async () => {
    if (!user) {
      toast.error('Please log in to join waitlist');
      return;
    }

    try {
      setLoading(true);
      
      // In real app, this would add to waitlist table
      const position = Math.floor(Math.random() * 5) + 1;
      setWaitlistPosition(position);
      
      toast.success(`Added to waitlist! You're #${position} in line.`);
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast.error('Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const selectedSlot = availableSlots.find(slot => slot.time === selectedTime);
  const totalPrice = selectedSlot ? selectedSlot.price * (duration / 60) : 0;
  const urgencyFee = isUrgent ? totalPrice * 0.2 : 0;
  const finalPrice = totalPrice + urgencyFee;

  if (showPayment && user && selectedDate && selectedTime) {
    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes);

    return (
      <StripeCheckout
        creator={{
          id: creatorId,
          full_name: creatorName,
          avatar_url: creatorAvatar,
          callRate
        }}
        duration={duration}
        scheduledTime={scheduledDateTime.toISOString()}
        onSuccess={() => {
          setShowPayment(false);
          onBookingComplete?.();
          toast.success('Session booked successfully!');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Book a Session with {creatorName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label className="text-base font-semibold">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > addMonths(new Date(), 3)}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-4">
              {/* Time Zone */}
              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Your Time Zone
                </Label>
                <Select value={timeZone} onValueChange={setTimeZone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZones.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Session Duration
                </Label>
                <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map(d => (
                      <SelectItem key={d.value} value={d.value.toString()}>
                        {d.label} - ${(callRate * d.price).toFixed(0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Repeat Options */}
              <div>
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Repeat Booking
                </Label>
                <Select value={repeatType} onValueChange={setRepeatType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repeatOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Available Time Slots */}
          {selectedDate && (
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Available Times for {format(selectedDate, 'MMMM dd, yyyy')}
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className="flex flex-col h-auto py-2"
                  >
                    <span className="text-sm font-medium">{slot.time}</span>
                    <span className="text-xs opacity-75">${slot.price}/hr</span>
                  </Button>
                ))}
              </div>
              
              {availableSlots.filter(slot => slot.available).length === 0 && (
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No available slots for this date
                  </p>
                  <Button variant="outline" onClick={joinWaitlist} disabled={loading}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {loading ? 'Joining...' : 'Join Waitlist'}
                  </Button>
                  {waitlistPosition && (
                    <Badge variant="secondary" className="mt-2">
                      Position #{waitlistPosition}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <Label>Urgent Booking (+20% fee)</Label>
              </div>
              <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
            </div>

            <div>
              <Label>Special Notes or Requests</Label>
              <Textarea
                placeholder="Any specific topics or questions you'd like to discuss..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Booking Summary */}
          {selectedTime && selectedDate && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{format(selectedDate, 'MMM dd, yyyy')} at {selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  {isUrgent && (
                    <div className="flex justify-between text-orange-600">
                      <span>Urgency Fee:</span>
                      <span>+${urgencyFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base border-t pt-2">
                    <span>Total:</span>
                    <span>${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  onClick={handleBooking}
                  disabled={!selectedTime || !user}
                >
                  {!user ? 'Please Log In' : `Book Session - $${finalPrice.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}