import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversalChat } from '@/components/chat/UniversalChat';
import { createOverlayConfig, createPrivateConfig } from '@/lib/chatConfigs';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  creatorId: string;
  fanId: string;
  className?: string;
  leftButton?: React.ReactNode;
  isInQueue?: boolean;
};

export default function TabbedOverlayChat({ 
  creatorId, 
  fanId,
  className = "",
  leftButton,
  isInQueue = false
}: Props) {
  const [activeTab, setActiveTab] = useState<'lobby' | 'private'>('lobby');
  const [unreadPrivateCount, setUnreadPrivateCount] = useState(0);

  console.log('[TabbedOverlayChat] Rendering with:', { creatorId, fanId, isInQueue, activeTab });

  const lobbyConfig = createOverlayConfig(creatorId);
  const privateConfig = createPrivateConfig(creatorId, fanId);

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
    <div
      className={
        "absolute inset-x-0 max-h-[45vh] pointer-events-none " + className
      }
      style={{
        bottom: 'calc(var(--lsb-height, 0px) * var(--lsb-visible, 0) + 8px)',
        zIndex: 40
      }}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
        <TabsList className="w-full bg-black/60 backdrop-blur-sm border-0 rounded-none pointer-events-auto" style={{ zIndex: 50 }}>
          <TabsTrigger 
            value="lobby" 
            className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:border-b-2 data-[state=active]:border-primary text-white pointer-events-auto"
          >
            Lobby
          </TabsTrigger>
          {isInQueue && (
            <TabsTrigger 
              value="private" 
              className="flex-1 data-[state=active]:bg-white/20 data-[state=active]:border-b-2 data-[state=active]:border-primary text-white relative pointer-events-auto"
            >
              Private Messages
              {unreadPrivateCount > 0 && activeTab === 'lobby' && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadPrivateCount > 99 ? '99+' : unreadPrivateCount}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lobby" className="flex-1 m-0 pointer-events-none data-[state=active]:block">
          <div className="absolute inset-y-0 top-3 right-0 left-0 overflow-y-auto flex flex-col gap-2 pointer-events-auto pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            <UniversalChat 
              config={{
                ...lobbyConfig,
                appearance: {
                  ...lobbyConfig.appearance,
                  className: "bg-transparent border-0"
                }
              }}
              className="bg-transparent"
              leftButton={leftButton}
            />
          </div>
        </TabsContent>

        {isInQueue && (
          <TabsContent value="private" className="flex-1 m-0 pointer-events-none data-[state=active]:block">
            <div className="absolute inset-y-0 top-3 right-0 left-0 overflow-y-auto flex flex-col gap-2 pointer-events-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
            <UniversalChat 
              config={{
                ...privateConfig,
                appearance: {
                  ...privateConfig.appearance,
                  className: "bg-transparent border-0"
                }
              }}
              className="bg-transparent"
              leftButton={leftButton}
            />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
