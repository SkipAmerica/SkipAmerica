import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/app/providers/auth-provider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUniversalChat } from '@/hooks/useUniversalChat';
import type { ChatConfig } from '@/shared/types/chat';

interface UniversalChatProps {
  config: ChatConfig;
  className?: string;
}

export function UniversalChat({ config, className = '' }: UniversalChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    messages,
    newMessage,
    setNewMessage,
    sending,
    setSending,
    messagesEndRef
  } = useUniversalChat(config);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending || !config.messaging?.enabled) return;

    setSending(true);
    try {
      // Get user profile for avatar - Based on PQ implementation
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      
      const username = profile?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "guest";
      
      if (config.sendMessage) {
        await config.sendMessage({ 
          filterValue: config.filterValue, 
          userId: user.id, 
          username, 
          text: newMessage.trim() 
        });
      }
      setNewMessage('');
    } catch (error) {
      console.error('[UniversalChat] Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const height = config.appearance?.height || 'h-80';
  const width = config.appearance?.width || 'w-full';
  const maxWidth = config.appearance?.maxWidth;
  const showProfiles = config.appearance?.showProfiles ?? true;
  const compact = config.appearance?.compact ?? false;
  const emptyStateText = config.appearance?.emptyStateText || 'No messages yet. Start the conversation!';
  const messagingEnabled = config.messaging?.enabled ?? true;
  const placeholder = config.messaging?.placeholder || 'Type a message...';
  const showScrollbar = config.appearance?.showScrollbar ?? true;
  const messageFlow = config.appearance?.messageFlow || 'newest-bottom';
  const position = config.appearance?.position || 'default';

  // Position styling
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'top-right':
        return 'fixed top-4 right-4 z-50';
      case 'center':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
      case 'custom':
        return config.appearance?.className || '';
      case 'default':
      default:
        return '';
    }
  };

  // Message ordering for display
  const displayMessages = messageFlow === 'newest-top' 
    ? [...messages].reverse() 
    : messages;

  const containerClasses = `
    ${getPositionClasses()}
    ${position !== 'default' && position !== 'custom' ? `${width} ${maxWidth ? maxWidth : 'max-w-sm'}` : ''}
    ${position !== 'default' && position !== 'custom' ? 'bg-background border border-border rounded-lg shadow-lg' : ''}
    ${className}
  `.trim();

  const scrollAreaClasses = showScrollbar 
    ? "flex-1 p-4" 
    : "flex-1 p-4 [&>div>div]:!scrollbar-hide";

  return (
    <div className={`flex flex-col ${height} ${containerClasses}`}>
      <ScrollArea className={scrollAreaClasses}>
        <div className={compact ? "space-y-2" : "space-y-4"}>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className={compact ? 'text-xs' : 'text-sm'}>{emptyStateText}</p>
            </div>
          ) : (
            displayMessages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {showProfiles && (
                  <Avatar className={compact ? "h-6 w-6 flex-shrink-0" : "h-8 w-8 flex-shrink-0"}>
                    <AvatarImage src={message.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {message.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  {showProfiles && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                        {message.profiles?.full_name || 'Unknown User'}
                      </span>
                      <span className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  )}
                  <p className={`text-foreground break-words ${compact ? 'text-xs' : 'text-sm'}`}>
                    {message.message}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {messagingEnabled && (
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={placeholder}
              disabled={sending}
              className="flex-1"
            />
            {(config.messaging?.showSendButton ?? true) && (
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}