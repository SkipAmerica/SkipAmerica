import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { useAuth } from '@/app/providers/auth-provider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Users, Move, Anchor } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUniversalChat } from '@/hooks/useUniversalChat';
import { RichTextInput } from './RichTextInput';
import { RichTextMessage } from './RichTextMessage';
import { getProfileDisplayInfo, getAvatarSizeClasses, getTextSizeClasses } from '@/lib/profileUtils';
import type { ChatConfig } from '@/shared/types/chat';

interface UniversalChatProps {
  config: ChatConfig;
  className?: string;
  leftButton?: React.ReactNode;
}

export function UniversalChat({ config, className = '', leftButton }: UniversalChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showProfiles, setShowProfiles] = useState(config.appearance?.showProfiles ?? true);
  const [isFixed, setIsFixed] = useState(config.positioning?.mode === 'fixed');
  const showUsernames = config.appearance?.showUsernames ?? config.appearance?.showProfiles ?? true;
  const usernameStyle = config.appearance?.usernameStyle ?? 'bold';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const {
    messages,
    newMessage,
    setNewMessage,
    sending,
    setSending
  } = useUniversalChat(config);

  // Auto-scroll to bottom only when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending || !config.messaging?.enabled) return;

    setSending(true);
    try {
      // Try to fetch profile, but don't block if it fails
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profileError) {
        console.warn('[UniversalChat] Profile lookup failed:', profileError);
      }
      
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

  // Configuration values
  const height = config.appearance?.height || 'h-80';
  const width = config.appearance?.width || 'w-full';
  const maxWidth = config.appearance?.maxWidth;
  const showProfileToggle = config.appearance?.showProfileToggle ?? false;
  const compact = config.appearance?.compact ?? false;
  const emptyStateText = config.appearance?.emptyStateText || 'No messages yet. Start the conversation!';
  const messagingEnabled = config.messaging?.enabled ?? true;
  const placeholder = config.messaging?.placeholder || 'Type a message...';
  const showScrollbar = config.appearance?.showScrollbar ?? true;
  const messageFlow = config.appearance?.messageFlow || 'newest-bottom';
  const position = config.appearance?.position || 'default';
  const allowPositionToggle = config.positioning?.allowPositionToggle ?? false;
  const useExternalInput = config.externalInput?.useExternalInput ?? false;
  
  // Text size classes
  const textSizes = getTextSizeClasses(compact);
  const avatarSizeClasses = getAvatarSizeClasses(compact);

  // Position styling
  const getPositionClasses = () => {
    const useFixed = isFixed && position !== 'default';
    
    if (!useFixed) return '';
    
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
    ${isFixed && position !== 'default' && position !== 'custom' ? `${width} ${maxWidth ? maxWidth : 'max-w-sm'}` : ''}
    ${isFixed && position !== 'default' && position !== 'custom' ? 'bg-background border border-border rounded-lg shadow-lg' : ''}
    ${className}
  `.trim();

  const scrollAreaClasses = showScrollbar 
    ? "p-4" 
    : "p-4 [&>div>div]:!scrollbar-hide";

  return (
    <div className={`flex flex-col min-h-0 ${height} ${containerClasses}`}>
      {/* Header with controls */}
      {(showProfileToggle || allowPositionToggle) && (
        <div className="p-3 border-b bg-muted/50 space-y-2">
          {showProfileToggle && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label htmlFor="profile-toggle" className="text-sm font-medium">
                Show Profiles
              </Label>
              <Switch
                id="profile-toggle"
                checked={showProfiles}
                onCheckedChange={setShowProfiles}
                className="ml-auto"
              />
            </div>
          )}
          
          {allowPositionToggle && (
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4" />
              <Label htmlFor="position-toggle" className="text-sm font-medium">
                Fixed Position
              </Label>
              <Toggle
                pressed={isFixed}
                onPressedChange={setIsFixed}
                size="sm"
                variant="outline"
                className="ml-auto"
              >
                <Move className="h-3 w-3" />
              </Toggle>
            </div>
          )}
        </div>
      )}
      
      <ScrollArea className={`flex-1 min-h-0 ${scrollAreaClasses}`}>
        <div className={`pb-2 ${compact ? "space-y-0" : "space-y-0.5"}`}>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className={textSizes.message}>{emptyStateText}</p>
            </div>
          ) : (
            displayMessages.map((message) => {
              const profileInfo = getProfileDisplayInfo(message.profiles);
              
              return (
                <div key={message.id} className="flex gap-3 items-center">
                  {showProfiles && (
                    <Avatar className={`${avatarSizeClasses} flex-shrink-0`}>
                      <AvatarImage src={profileInfo.avatarUrl} />
                      <AvatarFallback 
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: profileInfo.backgroundColor,
                          color: profileInfo.textColor
                        }}
                      >
                        {profileInfo.initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0">
                    {showUsernames ? (
                      <span className={`inline-block text-foreground break-words ${textSizes.message} bg-white/70 backdrop-blur-md rounded-lg px-3 py-1.5`}>
                        <span className={`${usernameStyle === 'bold' ? 'font-bold' : 'font-medium'} ${textSizes.name}`}>
                          {profileInfo.fullName}:
                        </span>{' '}
                        <RichTextMessage message={message.message} />
                      </span>
                    ) : (
                      <span className={`inline-block text-foreground break-words ${textSizes.message} bg-white/70 backdrop-blur-md rounded-lg px-3 py-1.5`}>
                        <RichTextMessage message={message.message} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {messagingEnabled && !useExternalInput && (
        <div className="pb-2 px-4 pt-px shrink-0">
          <div className={config.appearance?.inputClassName || ''}>
            <RichTextInput
              value={newMessage}
              onChange={setNewMessage}
              onSubmit={handleSendMessage}
              placeholder={placeholder}
              disabled={sending}
              richText={config.richText}
              showSendButton={config.messaging?.showSendButton ?? true}
              leftButton={leftButton}
            />
          </div>
        </div>
      )}
    </div>
  );
}