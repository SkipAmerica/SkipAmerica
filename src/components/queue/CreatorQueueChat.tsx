import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { UniversalChat } from '@/components/chat/UniversalChat';
import { createQueueLobbyConfig, createQueuePrivateConfig } from '@/lib/chatConfigs';
import { supabase } from '@/integrations/supabase/client';

type Props = {
  creatorId: string;
  fanId: string;
};

export function CreatorQueueChat({ creatorId, fanId }: Props) {
  // Default to private messages tab for creator
  const [activeTab, setActiveTab] = useState<'lobby' | 'private'>('private');
  const [unreadPrivateCount, setUnreadPrivateCount] = useState(0);

  const lobbyConfig = useMemo(() => createQueueLobbyConfig(creatorId), [creatorId]);
  const privateConfig = useMemo(() => createQueuePrivateConfig(creatorId, fanId), [creatorId, fanId]);

  // Subscribe to private messages from the FAN
  useEffect(() => {
    if (!fanId || !creatorId) return;

    const conversationKey = [creatorId, fanId].sort().join('|');
    
    const channel = supabase
      .channel(`creator-private-unread-${conversationKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_private_messages',
          filter: `conversation_key=eq.${conversationKey}`
        },
        (payload) => {
          // Increment if message is FROM fan and creator is viewing lobby
          const newMessage = payload.new as { sender_id: string };
          if (activeTab === 'lobby' && newMessage.sender_id === fanId) {
            setUnreadPrivateCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fanId, creatorId, activeTab]);

  const handleTabChange = (value: string) => {
    const newTab = value as 'lobby' | 'private';
    setActiveTab(newTab);
    if (newTab === 'private') {
      setUnreadPrivateCount(0);
    }
  };

  return (
    <Card className="p-0 h-full min-h-0 flex flex-col">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full min-h-0 flex flex-col">
        <TabsList className="w-full sticky top-0 z-10 bg-background shrink-0">
          <TabsTrigger value="lobby" className="flex-1">
            Lobby Chat
          </TabsTrigger>
          {/* Always show private messages for creator */}
          <TabsTrigger value="private" className="flex-1 relative">
            Private Messages
            {unreadPrivateCount > 0 && activeTab === 'lobby' && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadPrivateCount > 99 ? '99+' : unreadPrivateCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lobby" className="mt-0 flex flex-col flex-1 min-h-0 p-0">
          <UniversalChat config={lobbyConfig} />
        </TabsContent>

        {/* Always render private messages for creator */}
        <TabsContent value="private" className="mt-0 flex flex-col flex-1 min-h-0 p-0">
          <UniversalChat config={privateConfig} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
