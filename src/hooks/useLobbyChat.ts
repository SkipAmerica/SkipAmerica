import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ChatMsg = {
  id: string;
  text: string;
  userId?: string;
  username?: string;
  ts: number; // epoch ms
};

export function useLobbyChat(creatorId?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!creatorId) return;

    // Use the exact same channel name and pattern as PQ
    const channelName = `lobby-chat-${creatorId}`;
    console.log("[useLobbyChat] subscribe ->", channelName);

    // Clean any prior channel before re-subscribing
    try {
      if (chanRef.current) {
        console.log("[useLobbyChat] removing previous channel");
        supabase.removeChannel(chanRef.current);
        chanRef.current = null;
      }
    } catch {}

    // Fetch initial messages (same as PQ)
    const fetchInitialMessages = async () => {
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from('lobby_chat_messages')
          .select('*')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: true })
          .limit(50);

        if (messagesError) throw messagesError;

        if (messagesData && messagesData.length > 0) {
          // Get unique user IDs
          const userIds = [...new Set(messagesData.map(msg => msg.user_id))];
          
          // Fetch profiles for all users
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (profilesError) throw profilesError;

          // Map profiles to messages
          const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
          
          const chatMessages = messagesData.map(msg => ({
            id: msg.id,
            text: msg.message,
            userId: msg.user_id,
            username: profilesMap.get(msg.user_id)?.full_name || 'User',
            ts: new Date(msg.created_at).getTime(),
          }));

          setMessages(chatMessages);
        }
      } catch (error) {
        console.error('[useLobbyChat] Error fetching initial messages:', error);
      }
    };

    fetchInitialMessages();

    // Subscribe to new messages using postgres_changes (same as PQ)
    const ch = supabase.channel(channelName);

    ch.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'lobby_chat_messages',
        filter: `creator_id=eq.${creatorId}`
      },
      async (payload) => {
        // Fetch profile for the new message
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        const chatMessage: ChatMsg = {
          id: payload.new.id,
          text: payload.new.message,
          userId: payload.new.user_id,
          username: profileData?.full_name || 'User',
          ts: new Date(payload.new.created_at).getTime(),
        };

        setMessages(prev => [...prev, chatMessage].slice(-200));
      }
    );

    ch.subscribe((status) => {
      console.log("[useLobbyChat] status:", status, channelName);
    });

    chanRef.current = ch;

    return () => {
      if ((window as any).__allow_ch_teardown) {
        try { 
          console.log("[useLobbyChat] unsubscribe <-", channelName);
          supabase.removeChannel(ch); 
        } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
      chanRef.current = null;
    };
  }, [creatorId]);

  return messages;
}