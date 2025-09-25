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

    let authSubscription: { unsubscribe: () => void } | null = null;

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
          const userIds = [...new Set(messagesData.map(msg => msg.user_id))];

          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (profilesError) throw profilesError;

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

    const subscribeToRealtime = async () => {
      const channelName = `lobby-chat-${creatorId}`;
      console.log('[useLobbyChat] subscribe ->', channelName);

      // Clean any prior channel before re-subscribing
      try {
        if (chanRef.current) {
          console.log('[useLobbyChat] removing previous channel');
          supabase.removeChannel(chanRef.current);
          chanRef.current = null;
        }
      } catch {}

      await fetchInitialMessages();

      // Subscribe to new messages using postgres_changes (same as PQ)
      const ch = supabase.channel(channelName);

      ch.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lobby_chat_messages',
          filter: `creator_id=eq.${creatorId}`,
        },
        async (payload) => {
          console.log('[useLobbyChat] INSERT received:', payload.new.id, 'creator_id:', payload.new.creator_id);

          // Fetch profile for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .maybeSingle();

          const chatMessage: ChatMsg = {
            id: payload.new.id,
            text: payload.new.message,
            userId: payload.new.user_id,
            username: profileData?.full_name || 'User',
            ts: new Date(payload.new.created_at).getTime(),
          };

          setMessages((prev) => [...prev, chatMessage].slice(-200));
        }
      );

      ch.subscribe((status) => {
        console.log('[useLobbyChat] status:', status, channelName);

        // Auto re-subscribe if channel goes CLOSED
        if (status === 'CLOSED') {
          setTimeout(() => {
            console.log('[useLobbyChat] auto re-subscribing after CLOSED');
            ch.subscribe();
          }, 1000);
        }
      });

      chanRef.current = ch;
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[useLobbyChat] waiting for session before subscribing');
      } else {
        await subscribeToRealtime();
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('[useLobbyChat] auth state change ->', event, !!newSession);
        // Teardown existing channel
        if (chanRef.current) {
          try { supabase.removeChannel(chanRef.current); } catch {}
          chanRef.current = null;
        }
        if (newSession) {
          await subscribeToRealtime();
        } else {
          console.warn('[useLobbyChat] session is null, not subscribing');
        }
      });
      authSubscription = subscription;
    };

    init();

    return () => {
      const channelName = `lobby-chat-${creatorId}`;
      if ((window as any).__allow_ch_teardown) {
        try {
          if (chanRef.current) {
            console.log('[useLobbyChat] unsubscribe <-', channelName);
            supabase.removeChannel(chanRef.current);
          }
        } catch {}
      } else {
        console.warn('[PQ-GUARD] prevented runtime removeChannel', new Error().stack);
      }
      chanRef.current = null;
      authSubscription?.unsubscribe?.();
    };
  }, [creatorId]);

  return messages;
}