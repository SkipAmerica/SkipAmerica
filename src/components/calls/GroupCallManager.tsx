import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  DollarSign,
  Eye,
  MessageCircle,
  Crown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  message?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  joined_at: string;
  paid_amount: number;
}

interface GroupCallManagerProps {
  callId: string;
  creatorId: string;
  isCreator: boolean;
  basePrice: number;
  maxParticipants: number;
  currentParticipants: Participant[];
  onParticipantUpdate: (participants: Participant[]) => void;
}

export function GroupCallManager({
  callId,
  creatorId,
  isCreator,
  basePrice,
  maxParticipants,
  currentParticipants,
  onParticipantUpdate
}: GroupCallManagerProps) {
  const { user } = useAuth();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');

  // Calculate current pricing
  const currentCount = currentParticipants.length;
  const revenueMultiplier = 1 + (currentCount - 1) * 0.4;
  const totalRevenue = basePrice * revenueMultiplier;
  const pricePerPerson = totalRevenue / Math.max(currentCount, 1);

  useEffect(() => {
    if (isCreator) {
      loadJoinRequests();
    }
  }, [callId, isCreator]);

  const loadJoinRequests = async () => {
    try {
      // In real app, load from group_call_requests table
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock pending requests
      const mockRequests: JoinRequest[] = [
        {
          id: '1',
          user_id: 'user1',
          user_name: 'Jessica Park',
          user_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
          message: 'Would love to join this session about skincare routines!',
          created_at: new Date(Date.now() - 300000).toISOString(),
          status: 'pending'
        },
        {
          id: '2',
          user_id: 'user2',
          user_name: 'Alex Chen',
          user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          message: 'Hi! I\'m interested in the fashion tips discussion.',
          created_at: new Date(Date.now() - 600000).toISOString(),
          status: 'pending'
        }
      ];
      
      setJoinRequests(mockRequests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      
      // In real app, update request status and handle payment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (action === 'approve') {
        const request = joinRequests.find(r => r.id === requestId);
        if (request) {
          // Add to participants
          const newParticipant: Participant = {
            id: requestId,
            user_id: request.user_id,
            user_name: request.user_name,
            user_avatar: request.user_avatar,
            joined_at: new Date().toISOString(),
            paid_amount: pricePerPerson
          };
          
          const updatedParticipants = [...currentParticipants, newParticipant];
          onParticipantUpdate(updatedParticipants);
          
          toast.success(`${request.user_name} approved and added to call`);
        }
      } else {
        toast.success('Request rejected');
      }
      
      // Remove from pending requests
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      
    } catch (error) {
      console.error('Error handling join request:', error);
      toast.error('Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const requestToJoin = async () => {
    if (!user) {
      toast.error('Please log in to join calls');
      return;
    }

    try {
      setLoading(true);
      
      // In real app, create join request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Join request sent! The creator will review it shortly.');
      setShowJoinDialog(false);
      setJoinMessage('');
      
    } catch (error) {
      console.error('Error requesting to join:', error);
      toast.error('Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  if (!isCreator) {
    // Fan view - request to join button
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Join Group Call</div>
                <div className="text-sm text-muted-foreground">
                  {currentCount} {currentCount === 1 ? 'person' : 'people'} • ${pricePerPerson.toFixed(2)} per person
                </div>
              </div>
            </div>
            
            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={currentCount >= maxParticipants}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {currentCount >= maxParticipants ? 'Full' : 'Join'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request to Join Group Call</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Your Cost:</span>
                      <span className="text-lg font-bold">${pricePerPerson.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Price automatically adjusts based on group size
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Message to Creator (optional)</label>
                    <textarea
                      value={joinMessage}
                      onChange={(e) => setJoinMessage(e.target.value)}
                      placeholder="Why would you like to join this call?"
                      className="w-full mt-1 p-2 border rounded-md resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowJoinDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={requestToJoin} disabled={loading} className="flex-1">
                      {loading ? 'Sending...' : 'Send Request'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Creator view - manage participants and requests
  return (
    <div className="space-y-4">
      {/* Current Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Participants ({currentCount})
            </div>
            <Badge variant="secondary">
              ${totalRevenue.toFixed(2)} total revenue
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentParticipants.map((participant, index) => (
              <div key={participant.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={participant.user_avatar} />
                  <AvatarFallback>{participant.user_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{participant.user_name}</span>
                    {index === 0 && <Crown className="h-3 w-3 text-yellow-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Paid ${participant.paid_amount.toFixed(2)} • {formatDistanceToNow(new Date(participant.joined_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Join Requests */}
      {joinRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Join Requests ({joinRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={request.user_avatar} />
                      <AvatarFallback>{request.user_name[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{request.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {request.message}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Will pay ${pricePerPerson.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJoinRequest(request.id, 'reject')}
                        disabled={loading}
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleJoinRequest(request.id, 'approve')}
                        disabled={loading || currentCount >= maxParticipants}
                      >
                        <UserCheck className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Revenue Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold">${pricePerPerson.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Per Person</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">+{((revenueMultiplier - 1) * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">vs 1-on-1</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}