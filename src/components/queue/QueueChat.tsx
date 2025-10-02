import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { UniversalChat } from '@/components/chat/UniversalChat';
import { createQueueLobbyConfig, createQueuePrivateConfig } from '@/lib/chatConfigs';
import { supabase } from '@/integrations/supabase/client';

type Props = {
  creatorId: string;
  fanId: string;
  isInQueue?: boolean;
};

export function QueueChat({ 
  creatorId, 
  fanId,
  isInQueue = false
}: Props) {
  const [activeTab, setActiveTab] = useState<'lobby' | 'private'>('lobby');
  const [unreadPrivateCount, setUnreadPrivateCount] = useState(0);

  const lobbyConfig = useMemo(() => createQueueLobbyConfig(creatorId), [creatorId]);
  const privateConfig = useMemo(() => createQueuePrivateConfig(creatorId, fanId), [creatorId, fanId]);

  // Subscribe to private messages for unread count
  useEffect(() => {
    if (!fanId || !creatorId) return;

    const conversationKey = [creatorId, fanId].sort().join('|');
    
    const channel = supabase
      .channel(`private-unread-${conversationKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_private_messages',
          filter: `conversation_key=eq.${conversationKey}`
        },
        (payload) => {
          // Only increment if message is from creator and user is viewing lobby
          const newMessage = payload.new as { sender_id: string };
          if (activeTab === 'lobby' && newMessage.sender_id === creatorId) {
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
    <Card className="p-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="lobby" className="flex-1">
            Lobby Chat
          </TabsTrigger>
          {isInQueue && (
            <TabsTrigger value="private" className="flex-1 relative">
              Private Messages
              {unreadPrivateCount > 0 && activeTab === 'lobby' && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadPrivateCount > 99 ? '99+' : unreadPrivateCount}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lobby" className="mt-4">
          <div className="h-[400px]">
            <UniversalChat config={lobbyConfig} />
          </div>
        </TabsContent>

        {isInQueue && (
          <TabsContent value="private" className="mt-4">
            <div className="h-[400px]">
              <UniversalChat config={privateConfig} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
