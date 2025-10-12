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
  actualPosition?: number | null;
  hasConsented?: boolean;
};

export function QueueChat({ 
  creatorId, 
  fanId,
  isInQueue = false,
  actualPosition = null,
  hasConsented = false
}: Props) {
  const [activeTab, setActiveTab] = useState<'lobby' | 'private'>('lobby');
  const [unreadPrivateCount, setUnreadPrivateCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);

  const lobbyConfig = useMemo(() => createQueueLobbyConfig(creatorId, isInQueue), [creatorId, isInQueue]);
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

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.isContentEditable ||
      target.closest('input, textarea, button, a, [contenteditable="true"]') ||
      target.closest('[data-no-drag]');
    
    if (isInteractive || !isInQueue) return;
    
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isInQueue) return;
    const currentX = e.touches[0].clientX;
    const offset = currentX - startX;
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isInQueue) return;
    
    const threshold = 50;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && activeTab === 'private') {
        setActiveTab('lobby');
      } else if (dragOffset < 0 && activeTab === 'lobby') {
        setActiveTab('private');
        setUnreadPrivateCount(0);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <Card className="p-0 h-[224px] flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 min-h-0 flex flex-col">
        <TabsList 
          className="w-full shrink-0 sticky top-0 z-10 bg-background"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <TabsTrigger value="lobby" className="flex-1 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-muted-foreground">
            Lobby Chat
          </TabsTrigger>
          {isInQueue && hasConsented && actualPosition === 1 && (
            <TabsTrigger value="private" className="flex-1 relative data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-muted-foreground">
              Private Messages
              {unreadPrivateCount > 0 && activeTab === 'lobby' && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadPrivateCount > 99 ? '99+' : unreadPrivateCount}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lobby" className="mt-0 flex flex-col flex-1 min-h-0 p-0 data-[state=inactive]:hidden data-[state=inactive]:pointer-events-none">
          <UniversalChat config={lobbyConfig} />
        </TabsContent>

        {/* Always render private chat but hide when not ready */}
        <TabsContent value="private" className={`mt-0 flex flex-col flex-1 min-h-0 p-0 data-[state=inactive]:hidden ${!isInQueue || !hasConsented || actualPosition !== 1 ? 'hidden' : ''}`}>
          <UniversalChat config={privateConfig} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
