import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Phone, DollarSign, Ban, Star, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  mtype: string;
  attachment_url?: string;
}

interface Thread {
  id: string;
  type: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'offer' | 'priority'>('text');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerDuration, setOfferDuration] = useState('30');
  const [offerNote, setOfferNote] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch thread and messages
  useEffect(() => {
    if (!threadId || !profile?.id) return;

    const fetchThread = async () => {
      const { data: threadData } = await supabase
        .from('threads')
        .select(`
          id,
          type,
          user_id,
          user:profiles!threads_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', threadId)
        .single();

      if (threadData) {
        setThread(threadData as Thread);
        
        // Fetch messages for this thread
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (messagesData) {
          setMessages(messagesData);
        }
      }

      setIsLoading(false);

      // Mark thread as read
      await supabase.rpc('mark_thread_read', {
        p_thread_id: threadId,
        p_user_id: profile.id,
      });
    };

    fetchThread();

    // Subscribe to new messages
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, profile?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!threadId || !profile?.id || isSending || !thread?.user.id) return;

    // Validate based on message type
    if (messageType === 'text' && !newMessage.trim()) return;
    if (messageType === 'offer' && (!offerAmount || !offerDuration)) {
      toast({ title: 'Error', description: 'Please enter offer amount and duration', variant: 'destructive' });
      return;
    }
    if (messageType === 'priority' && !newMessage.trim()) return;

    setIsSending(true);

    try {
      if (messageType === 'offer') {
        // Create offer
        const amountCents = Math.round(parseFloat(offerAmount) * 100);
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .insert({
            creator_id: profile.id,
            user_id: thread.user.id,
            thread_id: threadId,
            amount_cents: amountCents,
            currency: 'USD',
            duration_minutes: parseInt(offerDuration),
            note: offerNote || null,
            status: 'pending',
          })
          .select()
          .single();

        if (offerError) throw offerError;

        // Send message about the offer
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender_id: profile.id,
          receiver_id: thread.user.id,
          content: `Sent offer: $${offerAmount} for ${offerDuration} minutes${offerNote ? ` - ${offerNote}` : ''}`,
          message_type: 'offer',
          mtype: 'offer',
        } as any);

        // Update thread type to offer
        await supabase
          .from('threads')
          .update({ type: 'offer', offer_id: offerData.id })
          .eq('id', threadId);

        toast({ title: 'Offer sent!', description: 'Your offer has been sent successfully.' });
        setOfferAmount('');
        setOfferDuration('30');
        setOfferNote('');
      } else if (messageType === 'priority') {
        // Send priority message (you can add priority_payments logic here if needed)
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender_id: profile.id,
          receiver_id: thread.user.id,
          content: newMessage.trim(),
          message_type: 'priority',
          mtype: 'text',
        } as any);

        // Update thread type to priority
        await supabase
          .from('threads')
          .update({ type: 'priority' })
          .eq('id', threadId);

        toast({ title: 'Priority message sent!', description: 'Your priority message has been sent.' });
        setNewMessage('');
      } else {
        // Send regular text message
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender_id: profile.id,
          receiver_id: thread.user.id,
          content: newMessage.trim(),
          message_type: 'text',
          mtype: 'text',
        } as any);

        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-white/60">Thread not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white/90 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="w-10 h-10 ring-2 ring-white/10">
          <AvatarImage src={thread.user.avatar_url} alt={thread.user.full_name} />
          <AvatarFallback className="bg-primary/20 text-white/90">
            {thread.user.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white/90 truncate">
            {thread.user.full_name}
          </h2>
        </div>

        {/* Quick Actions */}
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
          <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
          <DollarSign className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
          <Ban className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === profile?.id;
          return (
            <div
              key={message.id}
              className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2',
                  isOwn
                    ? 'bg-primary/90 text-white'
                    : 'bg-white/10 backdrop-blur-xl border border-white/20 text-white/90'
                )}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <span className="text-xs opacity-60 mt-1 block">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl">
        {profile?.account_type === 'creator' ? (
          <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="text" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Text
              </TabsTrigger>
              <TabsTrigger value="offer" className="text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                Offer
              </TabsTrigger>
              <TabsTrigger value="priority" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Priority
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-0">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className={cn(
                    'flex-1 min-h-[44px] max-h-32 resize-none',
                    'bg-white/10 backdrop-blur-xl border border-white/20',
                    'text-white/90 placeholder:text-white/40',
                    'focus:bg-white/12 focus:ring-1 focus:ring-white/30',
                    'rounded-xl'
                  )}
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-primary hover:bg-primary/90 text-white"
                  size="icon"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="offer" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Amount ($)</label>
                  <Input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="100"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Duration (min)</label>
                  <Input
                    type="number"
                    value={offerDuration}
                    onChange={(e) => setOfferDuration(e.target.value)}
                    placeholder="30"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <Input
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                placeholder="Add a note (optional)"
                className="bg-white/10 border-white/20 text-white"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!offerAmount || !offerDuration || isSending}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                Send Offer
              </Button>
            </TabsContent>

            <TabsContent value="priority" className="mt-0">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send a priority message..."
                  className={cn(
                    'flex-1 min-h-[44px] max-h-32 resize-none',
                    'bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/30',
                    'text-white/90 placeholder:text-white/40',
                    'focus:bg-emerald-500/12 focus:ring-1 focus:ring-emerald-500/50',
                    'rounded-xl'
                  )}
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  size="icon"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className={cn(
                'flex-1 min-h-[44px] max-h-32 resize-none',
                'bg-white/10 backdrop-blur-xl border border-white/20',
                'text-white/90 placeholder:text-white/40',
                'focus:bg-white/12 focus:ring-1 focus:ring-white/30',
                'rounded-xl'
              )}
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-primary hover:bg-primary/90 text-white"
              size="icon"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
