import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, DollarSign, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Collaborator {
  creator_id: string;
  name: string;
  profit_share: number;
  role: 'co-host' | 'guest';
}

export function EventCreator() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [totalPrice, setTotalPrice] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newCollaboratorId, setNewCollaboratorId] = useState("");
  const [newCollaboratorName, setNewCollaboratorName] = useState("");
  const [newCollaboratorShare, setNewCollaboratorShare] = useState(0);
  const [loading, setLoading] = useState(false);

  const addCollaborator = () => {
    if (!newCollaboratorId || !newCollaboratorName || newCollaboratorShare <= 0) {
      toast.error("Please fill all collaborator fields");
      return;
    }

    const totalExistingShare = collaborators.reduce((sum, c) => sum + c.profit_share, 0);
    if (totalExistingShare + newCollaboratorShare > 90) {
      toast.error("Total profit share cannot exceed 90% (host keeps minimum 10%)");
      return;
    }

    setCollaborators([
      ...collaborators,
      {
        creator_id: newCollaboratorId,
        name: newCollaboratorName,
        profit_share: newCollaboratorShare,
        role: 'guest'
      }
    ]);

    setNewCollaboratorId("");
    setNewCollaboratorName("");
    setNewCollaboratorShare(0);
  };

  const removeCollaborator = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  const createEvent = async () => {
    if (!user || !title || !scheduledDate || !scheduledTime) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      
      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('collaborative_events')
        .insert({
          host_creator_id: user.id,
          title,
          description,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: duration,
          total_price: totalPrice,
          max_participants: maxParticipants,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Add host as collaborator with remaining profit share
      const totalCollaboratorShare = collaborators.reduce((sum, c) => sum + c.profit_share, 0);
      const hostShare = 100 - totalCollaboratorShare;

      const collaboratorInserts = [
        {
          event_id: event.id,
          creator_id: user.id,
          profit_share_percentage: hostShare,
          role: 'host'
        },
        ...collaborators.map(c => ({
          event_id: event.id,
          creator_id: c.creator_id,
          profit_share_percentage: c.profit_share,
          role: c.role
        }))
      ];

      const { error: collaboratorError } = await supabase
        .from('event_collaborators')
        .insert(collaboratorInserts);

      if (collaboratorError) throw collaboratorError;

      toast.success("Collaborative event created successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setScheduledDate("");
      setScheduledTime("");
      setDuration(60);
      setTotalPrice(0);
      setMaxParticipants(50);
      setCollaborators([]);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Create Collaborative Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AI & Future of Work Panel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Total Price ($)</Label>
            <Input
              id="price"
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your collaborative event..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time *</Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="60"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="participants">Max Participants</Label>
          <Input
            id="participants"
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            placeholder="50"
          />
        </div>

        {/* Collaborator Management */}
        <div className="space-y-4">
          <Label>Event Collaborators & Profit Sharing</Label>
          
          {collaborators.length > 0 && (
            <div className="space-y-2">
              {collaborators.map((collaborator, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{collaborator.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {collaborator.profit_share}% share
                    </Badge>
                  </div>
                  <Button
                    onClick={() => removeCollaborator(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Creator ID"
              value={newCollaboratorId}
              onChange={(e) => setNewCollaboratorId(e.target.value)}
            />
            <Input
              placeholder="Creator Name"
              value={newCollaboratorName}
              onChange={(e) => setNewCollaboratorName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Profit Share %"
              value={newCollaboratorShare}
              onChange={(e) => setNewCollaboratorShare(Number(e.target.value))}
              max={90}
            />
            <Button onClick={addCollaborator} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Host Share: {100 - collaborators.reduce((sum, c) => sum + c.profit_share, 0)}%
          </p>
        </div>

        <Button 
          onClick={createEvent} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Creating..." : "Create Collaborative Event"}
        </Button>
      </CardContent>
    </Card>
  );
}