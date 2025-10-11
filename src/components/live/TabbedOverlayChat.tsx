import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversalChat } from '@/components/chat/UniversalChat';
import { createOverlayConfig, createPrivateConfig } from '@/lib/chatConfigs';
import { supabase } from '@/integrations/supabase/client';
import { audioNotifications } from '@/lib/audio-notifications';
import notificationSound from '@/assets/notification-sound.mp3';

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);

  console.log('[TabbedOverlayChat] Rendering with:', { creatorId, fanId, isInQueue, activeTab });

  const lobbyConfig = createOverlayConfig(creatorId);
  const privateConfig = createPrivateConfig(creatorId, fanId);

  // Initialize audio notifications with autoplay primer
  useEffect(() => {
    audioNotifications.initialize();
    
    // Primer: Enable audio on first user interaction (handles autoplay policy)
    const enableAudio = () => {
      console.log('[TabbedOverlayChat] User interaction detected, priming audio...');
      const testAudio = new Audio(notificationSound);
      testAudio.volume = 0.01; // Almost silent
      testAudio.play().then(() => {
        console.log('[TabbedOverlayChat] ✅ Audio primed successfully');
        testAudio.pause();
      }).catch(e => {
        console.warn('[TabbedOverlayChat] ❌ Audio primer failed:', e);
      });
    };
    
    // Listen for first interaction
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

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
    <div
      className={
        "fixed left-0 right-0 max-h-[45vh] pointer-events-none " + className
      }
      style={{
        bottom: 'calc(var(--lsb-height, 0px) * var(--lsb-visible, 0) + 208px)',
        zIndex: 60,
        minHeight: '3rem'
      }}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full relative flex flex-col">
        <TabsList 
          className="w-full bg-black/60 backdrop-blur-sm border-0 rounded-none pointer-events-auto" 
          style={{ zIndex: 50 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <TabsTrigger 
            value="lobby" 
            className="flex-1 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-white/70 pointer-events-auto"
          >
            Lobby
          </TabsTrigger>
          {isInQueue && (
            <TabsTrigger 
              value="private" 
              className="flex-1 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-white/70 relative pointer-events-auto"
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
