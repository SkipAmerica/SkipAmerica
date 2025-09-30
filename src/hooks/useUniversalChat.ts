import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatConfig } from '@/shared/types/chat';

export function useUniversalChat(config: ChatConfig, onNewMessage?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch initial messages - Based on PQ implementation
  useEffect(() => {
    if (!config.filterValue) return;

    const fetchMessages = async () => {
      try {
        // Fetch messages and then get profile data separately
        const { data: messagesData, error: messagesError } = await supabase
          .from(config.tableName as any)
          .select('*')
          .eq(config.filterField, config.filterValue)
          .order('created_at', { 
            ascending: config.appearance?.messageFlow === 'newest-top' ? false : true 
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
        }
      } catch (error) {
        console.error(`[useUniversalChat] Error fetching messages:`, error);
      }
    };

    fetchMessages();

    // Subscribe to new messages - Based on PQ implementation
    const channel = supabase
      .channel(`${config.channelPrefix}-${config.filterValue}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: config.tableName,
          filter: `${config.filterField}=eq.${config.filterValue}`
        },
        async (payload) => {
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

          const flow = config.appearance?.messageFlow || 'newest-bottom';
          setMessages(prev => {
            const newMessages = flow === 'newest-top' 
              ? [enrichedMessage, ...prev]
              : [...prev, enrichedMessage];
            
            // Notify about new message for scroll handling
            onNewMessage?.();
            
            return newMessages;
          });
        }
      )
      .subscribe();

    return () => {
      if ((window as any).__allow_ch_teardown) {
        try { supabase.removeChannel(channel); } catch {}
      } else {
        console.warn('[UniversalChat-GUARD] prevented runtime removeChannel', new Error().stack);
      }
    };
  }, [config.tableName, config.filterField, config.filterValue, config.channelPrefix, config.appearance?.messageFlow]);

  return {
    messages,
    newMessage,
    setNewMessage,
    sending,
    setSending
  };
}