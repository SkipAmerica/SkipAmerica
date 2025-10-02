import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Phone, DollarSign, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';

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
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
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
        
        // Fetch messages for this conversation
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${threadData.user_id}),and(sender_id.eq.${threadData.user_id},receiver_id.eq.${profile.id})`)
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
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if it's part of this conversation
          if (
            (newMsg.sender_id === profile.id && newMsg.receiver_id === thread?.user.id) ||
            (newMsg.sender_id === thread?.user.id && newMsg.receiver_id === profile.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
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
    if (!newMessage.trim() || !threadId || !profile?.id || isSending) return;

    setIsSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: thread.user.id,
      content: newMessage.trim(),
      message_type: 'text',
    });

    if (!error) {
      setNewMessage('');
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
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
