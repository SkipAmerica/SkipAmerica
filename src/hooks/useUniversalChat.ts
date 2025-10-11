import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatConfig } from '@/shared/types/chat';
import { audioNotifications } from '@/lib/audio-notifications';

export function useUniversalChat(config: ChatConfig, onNewMessage?: () => void, playSound?: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Extract stable primitive values to prevent unnecessary re-renders
  const tableName = config.tableName;
  const filterField = config.filterField;
  const filterValue = config.filterValue;
  const channelPrefix = config.channelPrefix;
  const messageFlow = config.appearance?.messageFlow || 'newest-bottom';

  // Fetch initial messages - Based on PQ implementation
  useEffect(() => {
    console.log(`[useUniversalChat] Effect running for ${channelPrefix}-${filterValue}`, {
      tableName,
      filterField,
      filterValue,
      channelPrefix,
      messageFlow
    });
    
    if (!filterValue) return;

    const fetchMessages = async () => {
      console.log(`[useUniversalChat] Fetching initial messages from ${tableName}`);
      try {
        // Fetch messages and then get profile data separately
        const { data: messagesData, error: messagesError } = await supabase
          .from(tableName as any)
          .select('*')
          .eq(filterField, filterValue)
          .order('created_at', { 
            ascending: messageFlow === 'newest-top' ? false : true 
          })
          .limit(50);

        if (messagesError) throw messagesError;

        if (messagesData && messagesData.length > 0) {
          // Get unique user IDs - handle both user_id and sender_id for different table structures
          const userIds = [...new Set(messagesData.map((msg: any) => msg.user_id ?? msg.sender_id).filter(Boolean))];
          
          // Fetch profiles for all users
          let profilesMap = new Map();
          if (userIds.length > 0) {
            try {
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds);

              if (profilesError) throw profilesError;
              profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
            } catch (error) {
              console.error(`[useUniversalChat] Error fetching profiles:`, error);
            }
          }
          
          const enrichedMessages: ChatMessage[] = messagesData.map((msg: any) => {
            const senderId = msg.user_id ?? msg.sender_id;
            return {
              id: msg.id,
              user_id: senderId,
              message: msg.message,
              created_at: msg.created_at,
              profiles: profilesMap.get(senderId) || null
            };
          });

          setMessages(enrichedMessages);
          console.log(`[useUniversalChat] Loaded ${enrichedMessages.length} initial messages`);
        } else {
          console.log(`[useUniversalChat] No initial messages found for ${channelPrefix}-${filterValue}`);
        }
      } catch (error) {
        console.error(`[useUniversalChat] Error fetching messages:`, error);
      }
    };

    fetchMessages();

    // Subscribe to new messages - Based on PQ implementation
    const channelName = `${channelPrefix}-${filterValue}`;
    console.log(`[useUniversalChat] Creating channel: ${channelName}`);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `${filterField}=eq.${filterValue}`
        },
        async (payload) => {
          console.log(`[useUniversalChat] Real-time INSERT received on ${channelName}:`, payload.new);
          
          // Play notification sound if enabled
          if (playSound) {
            audioNotifications.playNotification();
          }
          
          // Handle both user_id and sender_id for different table structures
          const senderId = (payload.new as any).user_id ?? (payload.new as any).sender_id;
          
          // Fetch profile for the new message - handle errors gracefully
          let profileData = null;
          if (senderId) {
            try {
              const { data } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', senderId)
                .single();
              profileData = data;
            } catch (error) {
              console.error(`[useUniversalChat] Error fetching profile for new message:`, error);
            }
          }

          const enrichedMessage: ChatMessage = {
            id: (payload.new as any).id,
            user_id: senderId,
            message: (payload.new as any).message,
            created_at: (payload.new as any).created_at,
            profiles: profileData || undefined
          };

          setMessages(prev => {
            const newMessages = messageFlow === 'newest-top' 
              ? [enrichedMessage, ...prev]
              : [...prev, enrichedMessage];
            
            // Notify about new message for scroll handling
            onNewMessage?.();
            
            console.log(`[useUniversalChat] Added new message to state. Total messages: ${newMessages.length}`);
            
            return newMessages;
          });
        }
      )
      .subscribe((status) => {
        console.log(`[useUniversalChat] Channel ${channelName} subscription status:`, status);
      });

    return () => {
      console.log(`[useUniversalChat] Cleaning up channel: ${channelName}`);
      try { 
        supabase.removeChannel(channel);
        console.log(`[useUniversalChat] Channel ${channelName} removed successfully`);
      } catch (error) {
        console.error('[useUniversalChat] Error removing channel:', error);
      }
    };
  }, [tableName, filterField, filterValue, channelPrefix, messageFlow, onNewMessage, playSound]);

  return {
    messages,
    newMessage,
    setNewMessage,
    sending,
    setSending
  };
}