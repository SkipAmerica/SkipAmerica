import { useState } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import type { ChatConfig } from '@/shared/types/chat';

export function useExternalChatInput(config: ChatConfig) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const sendExternalMessage = async (message: string) => {
    if (!message.trim() || !user || sending || !config.sendMessage) return;

    setSending(true);
    try {
      // Get user profile for avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      
      const username = profile?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "guest";
      
      await config.sendMessage({ 
        filterValue: config.filterValue, 
        userId: user.id, 
        username, 
        text: message.trim() 
      });

      // Call external callback if provided
      if (config.externalInput?.onExternalMessage) {
        config.externalInput.onExternalMessage(message.trim());
      }
    } catch (error) {
      console.error('[useExternalChatInput] Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  return {
    sendExternalMessage,
    sending,
    user,
    isAuthenticated: !!user
  };
}