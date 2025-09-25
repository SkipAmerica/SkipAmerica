import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatConfig } from '@/shared/types/chat';

export function useUniversalChat(config: ChatConfig) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToNewest = () => {
    const flow = config.appearance?.messageFlow || 'newest-bottom';
    const shouldScroll = config.appearance?.scrollToNewest !== false;
    
    if (!shouldScroll) return;
    
    if (flow === 'newest-top') {
      scrollToTop();
    } else {
      scrollToBottom();
    }
  };

  useEffect(() => {
    scrollToNewest();
  }, [messages]);

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
          // Get unique user IDs - cast to any to handle dynamic table structure
          const userIds = [...new Set(messagesData.map((msg: any) => msg.user_id))];
          
          // Fetch profiles for all users
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (profilesError) throw profilesError;

          // Map profiles to messages
          const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
          
          const enrichedMessages: ChatMessage[] = messagesData.map((msg: any) => ({
            id: msg.id,
            user_id: msg.user_id,
            message: msg.message,
            created_at: msg.created_at,
            profiles: profilesMap.get(msg.user_id) || null
          }));

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
          // Fetch profile for the new message - cast payload to handle dynamic table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', (payload.new as any).user_id)
            .single();

          const enrichedMessage: ChatMessage = {
            id: (payload.new as any).id,
            user_id: (payload.new as any).user_id,
            message: (payload.new as any).message,
            created_at: (payload.new as any).created_at,
            profiles: profileData || undefined
          };

          const flow = config.appearance?.messageFlow || 'newest-bottom';
          setMessages(prev => 
            flow === 'newest-top' 
              ? [enrichedMessage, ...prev]
              : [...prev, enrichedMessage]
          );
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
  }, [config]);

  return {
    messages,
    newMessage,
    setNewMessage,
    sending,
    setSending,
    messagesEndRef,
    scrollToBottom,
    scrollToTop,
    scrollToNewest
  };
}