import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Save, Plus, Trash2 } from "lucide-react";

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const AvailabilityManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  useEffect(() => {
    if (user?.id) {
      loadAvailability();
    }
  }, [user?.id]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("creator_availability")
        .select("*")
        .eq("creator_id", user?.id)
        .order("day_of_week");

      if (error) throw error;

      // Initialize with default availability if none exists
      if (!data || data.length === 0) {
        const defaultAvailability = daysOfWeek.map((_, index) => ({
          day_of_week: index,
          start_time: "09:00",
          end_time: "17:00",
          is_active: index >= 1 && index <= 5, // Monday to Friday by default
        }));
        setAvailability(defaultAvailability);
      } else {
        setAvailability(data);
      }
    } catch (error) {
      console.error("Error loading availability:", error);
      toast({
        title: "Error loading availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = (dayIndex: number, field: keyof AvailabilitySlot, value: any) => {
    setAvailability(prev => prev.map((slot, index) => 
      index === dayIndex ? { ...slot, [field]: value } : slot
    ));
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSlot = {
      day_of_week: dayIndex,
      start_time: "09:00",
      end_time: "17:00",
      is_active: true,
    };
    
    setAvailability(prev => [...prev, newSlot]);
  };

  const removeTimeSlot = (dayIndex: number, slotId?: string) => {
    if (slotId) {
      setAvailability(prev => prev.filter(slot => slot.id !== slotId));
    } else {
      // Remove the last slot for this day
      const daySlots = availability.filter(slot => slot.day_of_week === dayIndex);
      if (daySlots.length > 1) {
        const lastSlot = daySlots[daySlots.length - 1];
        setAvailability(prev => prev.filter(slot => slot !== lastSlot));
      }
    }
  };

  const saveAvailability = async () => {
    try {
      setSaving(true);

      // Delete existing availability
      await supabase
        .from("creator_availability")
        .delete()
        .eq("creator_id", user?.id);

      // Insert new availability
      const availabilityData = availability
        .filter(slot => slot.is_active)
        .map(slot => ({
          creator_id: user?.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: slot.is_active,
        }));

      if (availabilityData.length > 0) {
        const { error } = await supabase
          .from("creator_availability")
          .insert(availabilityData);

        if (error) throw error;
      }

      toast({
        title: "Availability updated successfully",
      });

      // Reload the data to get the new IDs
      loadAvailability();
    } catch (error) {
      console.error("Error saving availability:", error);
      toast({
        title: "Error saving availability",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading availability...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Set your available hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {daysOfWeek.map((day, dayIndex) => {
            const daySlots = availability.filter(slot => slot.day_of_week === dayIndex);
            const hasActiveSlot = daySlots.some(slot => slot.is_active);

            return (
              <div key={dayIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium">{day}</h3>
                    <Badge variant={hasActiveSlot ? "secondary" : "outline"}>
                      {hasActiveSlot ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </div>

                {daySlots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center space-x-4 mb-3">
                    <Switch
                      checked={slot.is_active}
                      onCheckedChange={(checked) => 
                        updateAvailability(dayIndex, 'is_active', checked)
                      }
                    />
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateAvailability(dayIndex, 'start_time', e.target.value)}
                        disabled={!slot.is_active}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateAvailability(dayIndex, 'end_time', e.target.value)}
                        disabled={!slot.is_active}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </div>

                    {daySlots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(dayIndex, slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeSlot(dayIndex)}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Time Slot
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
          <CardDescription>
            Apply common availability patterns with one click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const businessHours = daysOfWeek.map((_, index) => ({
                  day_of_week: index,
                  start_time: "09:00",
                  end_time: "17:00",
                  is_active: index >= 1 && index <= 5,
                }));
                setAvailability(businessHours);
              }}
            >
              Business Hours
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const evenings = daysOfWeek.map((_, index) => ({
                  day_of_week: index,
                  start_time: "18:00",
                  end_time: "23:00",
                  is_active: true,
                }));
                setAvailability(evenings);
              }}
            >
              Evenings Only
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const weekends = daysOfWeek.map((_, index) => ({
                  day_of_week: index,
                  start_time: "10:00",
                  end_time: "22:00",
                  is_active: index === 0 || index === 6,
                }));
                setAvailability(weekends);
              }}
            >
              Weekends Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveAvailability} 
          disabled={saving}
          className="bg-gradient-primary hover:bg-gradient-secondary"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Availability"}
        </Button>
      </div>
    </div>
  );
};

export default AvailabilityManager;