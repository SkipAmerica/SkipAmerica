import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type ChatMsg = {
  id: string;
  text: string;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  ts: number; // epoch ms
};

export function useLobbyChat(creatorId?: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupRealtimeConnection = async (creatorId: string, attempt: number = 0) => {
    console.log(`[useLobbyChat] Setting up connection for creator ${creatorId} (attempt ${attempt + 1})`);
    setConnectionStatus('connecting');

    // Clean up existing channel
    if (chanRef.current) {
      try { 
        await supabase.removeChannel(chanRef.current);
        console.log("[useLobbyChat] Cleaned up existing channel");
      } catch (e) {
        console.warn("[useLobbyChat] Error cleaning up channel:", e);
      }
      chanRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Set up real-time subscription
      const channelName = `realtime:lobby-chat-${creatorId}`;
      const ch = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

      ch.on("broadcast", { event: "message" }, (payload: any) => {
        const body = payload?.payload ?? payload ?? {};
        console.debug("[useLobbyChat] rx", channelName, body);
        const msg: ChatMsg = {
          id: body.id ?? crypto.randomUUID(),
          text: body.text ?? "",
          userId: body.userId,
          username: body.username,
          avatarUrl: body.avatarUrl,
          ts: Date.now(),
        };
        // Append new message to existing history
        setMessages((prev) => [...prev, msg]);
      });

      const subscribePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, 10000); // 10 second timeout

        ch.subscribe((status) => {
          console.log("[useLobbyChat] subscription status:", channelName, status);
          clearTimeout(timeout);
          
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setRetryCount(0);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('error');
            reject(new Error(`Subscription failed: ${status}`));
          }
        });
      });

      chanRef.current = ch;
      await subscribePromise;
      
    } catch (error) {
      console.error("[useLobbyChat] Connection failed:", error);
      setConnectionStatus('error');
      
      // Exponential backoff retry (max 5 attempts)
      if (attempt < 4) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
        console.log(`[useLobbyChat] Retrying in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setRetryCount(attempt + 1);
          setupRealtimeConnection(creatorId, attempt + 1);
        }, delay);
      }
    }
  };

  useEffect(() => {
    console.log(`[useLobbyChat] Hook mounted/updated with creatorId: ${creatorId}`);
    
    if (!creatorId) {
      console.log("[useLobbyChat] No creatorId provided, cleaning up");
      setMessages([]);
      setConnectionStatus('disconnected');
      setRetryCount(0);
      
      if (chanRef.current) {
        try { supabase.removeChannel(chanRef.current); } catch {}
        chanRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    // Load historical messages first
    const loadHistoricalMessages = async () => {
      console.log(`[useLobbyChat] Loading historical messages for creator ${creatorId}`);
      setLoading(true);
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .from("lobby_chat_messages")
            .select(`
              id,
              message,
              created_at,
              user_id,
              profiles(full_name, avatar_url)
            `)
            .eq("creator_id", creatorId)
            .order("created_at", { ascending: true })
            .limit(500); // Load last 500 messages

          if (error) {
            throw error;
          }
          
          if (data) {
            const historicalMsgs: ChatMsg[] = data.map((row: any) => ({
              id: row.id,
              text: row.message,
              userId: row.user_id,
              username: row.profiles?.full_name?.split(' ')[0] || 'User',
              avatarUrl: row.profiles?.avatar_url,
              ts: new Date(row.created_at).getTime(),
            }));
            console.log(`[useLobbyChat] Loaded ${historicalMsgs.length} historical messages`);
            setMessages(historicalMsgs);
          }
          break; // Success, exit retry loop
          
        } catch (e) {
          attempts++;
          console.warn(`[useLobbyChat] Failed to load historical messages (attempt ${attempts}):`, e);
          
          if (attempts >= maxAttempts) {
            console.error("[useLobbyChat] Failed to load historical messages after all retries");
            setMessages([]); // Reset to empty array on final failure
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
      
      setLoading(false);
    };

    loadHistoricalMessages();
    setupRealtimeConnection(creatorId);

    return () => {
      console.log(`[useLobbyChat] Cleaning up for creator ${creatorId}`);
      try { 
        if (chanRef.current) supabase.removeChannel(chanRef.current);
      } catch {}
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      chanRef.current = null;
      reconnectTimeoutRef.current = null;
    };
  }, [creatorId]);

  return { messages, loading, connectionStatus, retryCount };
}
