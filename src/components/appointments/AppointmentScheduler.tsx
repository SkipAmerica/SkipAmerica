import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AppointmentScheduler() {
  const { user } = useAuth();
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAvailability();
    }
  }, [user]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_availability')
        .select('*')
        .eq('creator_id', user?.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAvailabilitySlots(data || []);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '10:00',
      is_active: true
    };
    setAvailabilitySlots([...availabilitySlots, newSlot]);
  };

  const updateTimeSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availabilitySlots];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilitySlots(updated);
  };

  const removeTimeSlot = async (index: number) => {
    const slot = availabilitySlots[index];
    if (slot.id) {
      try {
        const { error } = await supabase
          .from('creator_availability')
          .delete()
          .eq('id', slot.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting slot:', error);
        toast.error('Failed to delete time slot');
        return;
      }
    }
    
    const updated = availabilitySlots.filter((_, i) => i !== index);
    setAvailabilitySlots(updated);
  };

  const saveAvailability = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Delete all existing slots and recreate
      await supabase
        .from('creator_availability')
        .delete()
        .eq('creator_id', user.id);

      // Insert new slots
      const slotsToInsert = availabilitySlots.map(slot => ({
        creator_id: user.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active
      }));

      if (slotsToInsert.length > 0) {
        const { error } = await supabase
          .from('creator_availability')
          .insert(slotsToInsert);

        if (error) throw error;
      }

      toast.success('Availability updated successfully');
      loadAvailability();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const getDaySlotsCount = (dayOfWeek: number) => {
    return availabilitySlots.filter(slot => slot.day_of_week === dayOfWeek && slot.is_active).length;
  };

  if (loading) {
    return <div className="p-6">Loading availability...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Your Availability</CardTitle>
        <p className="text-muted-foreground">
          Set your available time slots for appointments. Fans can book these slots even when you're offline.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {DAYS.map((day, dayIndex) => (
          <div key={dayIndex} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label className="font-medium">{day}</Label>
                <Badge variant="secondary">
                  {getDaySlotsCount(dayIndex)} slots
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addTimeSlot(dayIndex)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Slot
              </Button>
            </div>
            
            <div className="space-y-2 ml-4">
              {availabilitySlots
                .filter(slot => slot.day_of_week === dayIndex)
                .map((slot, slotIndex) => {
                  const actualIndex = availabilitySlots.findIndex(s => s === slot);
                  return (
                    <div key={slotIndex} className="flex items-center space-x-2 p-2 border rounded">
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateTimeSlot(actualIndex, 'start_time', e.target.value)}
                        className="w-auto"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateTimeSlot(actualIndex, 'end_time', e.target.value)}
                        className="w-auto"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={slot.is_active}
                          onCheckedChange={(checked) => updateTimeSlot(actualIndex, 'is_active', checked)}
                        />
                        <Label className="text-sm">Active</Label>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTimeSlot(actualIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              {availabilitySlots.filter(slot => slot.day_of_week === dayIndex).length === 0 && (
                <p className="text-sm text-muted-foreground ml-2">No time slots set for this day</p>
              )}
            </div>
          </div>
        ))}
        
        <div className="flex justify-end pt-4">
          <Button onClick={saveAvailability} disabled={loading}>
            {loading ? 'Saving...' : 'Save Availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}