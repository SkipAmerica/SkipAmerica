import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays, isAfter, startOfDay } from 'date-fns';

interface Appointment {
  id: string;
  creator_id: string;
  fan_id: string;
  scheduled_at: string;
  duration_minutes: number;
  creator_name?: string;
  fan_name?: string;
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  suggested_date?: string;
  is_date_suggestion: boolean;
  created_at: string;
  sender_name?: string;
}

interface ReschedulingChatProps {
  appointment: Appointment;
  onClose: () => void;
}

export function ReschedulingChat({ appointment, onClose }: ReschedulingChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, [appointment.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name)
        `)
        .eq('appointment_id', appointment.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedMessages = data?.map(msg => ({
        ...msg,
        sender_name: msg.sender?.full_name || 'Unknown User'
      })) || [];

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`appointment-messages-${appointment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointment_messages',
          filter: `appointment_id=eq.${appointment.id}`
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  };

  const sendMessage = async (message: string, suggestedDate?: Date, isDateSuggestion = false) => {
    if (!user || (!message.trim() && !isDateSuggestion)) return;

    try {
      const messageData = {
        appointment_id: appointment.id,
        sender_id: user.id,
        message: message.trim() || `Suggested new date: ${format(suggestedDate!, 'EEEE, MMMM d, yyyy')} at ${selectedTime}`,
        suggested_date: suggestedDate?.toISOString(),
        is_date_suggestion: isDateSuggestion
      };

      const { error } = await supabase
        .from('appointment_messages')
        .insert(messageData);

      if (error) throw error;

      setNewMessage('');
      setShowCalendar(false);
      setSelectedDate(undefined);
      setSelectedTime('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const acceptDateSuggestion = async (message: Message) => {
    if (!message.suggested_date) return;

    try {
      setLoading(true);

      // Update appointment with new date
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          scheduled_at: message.suggested_date,
          status: 'scheduled' // Keep as scheduled, not rescheduled
        })
        .eq('id', appointment.id);

      if (updateError) throw updateError;

      // Send confirmation message
      await sendMessage(`✅ Accepted the new date: ${format(new Date(message.suggested_date), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}`);

      toast.success('Appointment rescheduled successfully!');
      
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error accepting date suggestion:', error);
      toast.error('Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const suggestDate = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const suggestionDate = new Date(selectedDate);
    suggestionDate.setHours(hours, minutes, 0, 0);

    sendMessage('', suggestionDate, true);
  };

  const isOwnMessage = (message: Message) => message.sender_id === user?.id;
  const otherPartyName = appointment.creator_id === user?.id ? appointment.fan_name : appointment.creator_name;

  return (
    <Card className="max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Reschedule Appointment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chat with {otherPartyName} to find a new time
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <div className="text-sm p-3 bg-muted rounded">
          <p><strong>Current:</strong> {format(new Date(appointment.scheduled_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}</p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    isOwnMessage(message)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {!isOwnMessage(message) && (
                    <p className="text-xs opacity-70 mb-1">{message.sender_name}</p>
                  )}
                  <p className="text-sm">{message.message}</p>
                  
                  {message.is_date_suggestion && message.suggested_date && !isOwnMessage(message) && (
                    <div className="mt-2 space-y-2">
                      <Badge variant="secondary" className="text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Date Suggestion
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => acceptDateSuggestion(message)}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? 'Accepting...' : 'Accept This Time'}
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs opacity-50 mt-1">
                    {format(new Date(message.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {showCalendar && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Suggest New Date & Time</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowCalendar(false)}>✕</Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => !isAfter(date, startOfDay(new Date()))}
                  className="rounded-md border"
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
                
                {selectedDate && selectedTime && (
                  <div className="p-3 bg-muted rounded text-sm">
                    <p><strong>Suggestion:</strong></p>
                    <p>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p>at {selectedTime}</p>
                  </div>
                )}
                
                <Button 
                  onClick={suggestDate}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Suggest This Time
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMessage)}
            className="flex-1"
          />
          <Button onClick={() => sendMessage(newMessage)} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowCalendar(!showCalendar)}>
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}