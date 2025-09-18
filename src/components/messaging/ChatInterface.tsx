import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Send, Phone, Video, MoreVertical, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'appointment_request' | 'system';
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ChatInterfaceProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  onStartCall?: () => void;
  onBookSession?: () => void;
}

export function ChatInterface({ 
  recipientId, 
  recipientName, 
  recipientAvatar,
  onStartCall,
  onBookSession 
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && recipientId) {
      loadMessages();
      subscribeToMessages();
    }
  }, [user, recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      // For now using mock data since types aren't updated yet
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockMessages: Message[] = [
        {
          id: '1',
          sender_id: recipientId,
          receiver_id: user?.id || '',
          content: 'Hi! Thanks for reaching out. How can I help you today?',
          message_type: 'text',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sender: {
            full_name: recipientName,
            avatar_url: recipientAvatar
          }
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user?.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user?.id}))`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      setLoading(true);
      
      // For now using mock message sending since types aren't updated yet
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newMsg: Message = {
        id: Date.now().toString(),
        sender_id: user.id,
        receiver_id: recipientId,
        content: newMessage.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        sender: {
          full_name: user.user_metadata?.full_name || 'You',
          avatar_url: user.user_metadata?.avatar_url
        }
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex-row items-center space-y-0 pb-3">
        <div className="flex items-center gap-3 flex-1">
          <Avatar>
            <AvatarImage src={recipientAvatar} />
            <AvatarFallback>{recipientName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{recipientName}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Online</span>
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                4.9
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onStartCall}>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onStartCall}>
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onBookSession}>
            Book Session
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwnMessage && (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={recipientAvatar} />
                        <AvatarFallback className="text-xs">{recipientName[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`rounded-lg px-3 py-2 ${
                      isOwnMessage 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[70%]">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={recipientAvatar} />
                    <AvatarFallback className="text-xs">{recipientName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={loading || !newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}