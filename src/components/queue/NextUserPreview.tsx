import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserVideoSFU } from '@/components/shared/UserVideoSFU';
import { cn } from '@/lib/utils';
import { MessageSquare, MoreVertical, Radio } from 'lucide-react';
import TabbedOverlayChat from '@/components/live/TabbedOverlayChat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NextUserPreviewProps {
  userId: string; // The fan whose video we're viewing
  creatorId: string;
  userName?: string;
  discussionTopic?: string;
  waitTime?: number;
  onStartCall?: () => void;
  onFullscreen?: () => void;
  onBroadcastToLobby?: () => void;
}

export function NextUserPreview({
  userId,
  creatorId,
  userName = 'Anonymous User',
  discussionTopic,
  waitTime,
  onStartCall,
  onFullscreen,
  onBroadcastToLobby
}: NextUserPreviewProps) {
  const [showNotification, setShowNotification] = useState(true);
  const [showInlineChat, setShowInlineChat] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowNotification(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  useEffect(() => {
    console.log(`[NextUserPreview] 🎯 Creator viewing fan's video - Fan ID: ${userId}, Creator ID: ${creatorId}`);
    console.log(`[NextUserPreview] 📺 Target Room: lobby_${userId}`);
  }, [userId, creatorId]);

  return (
    <div className="relative max-w-md mx-auto">
      {/* Privacy Notification */}
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-50",
        "bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full",
        "border border-white/20 text-white text-xs font-medium",
        "transition-opacity duration-1000",
        showNotification ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {userName} cannot see you
      </div>
      
      {/* Fan's Camera Feed - Creator viewing fan's room */}
      <UserVideoSFU
        userId={userId}
        role="viewer"
        videoRoomCreatorId={userId}
        chatCreatorId={creatorId}
        identityOverride={creatorId}
        chatParticipantFilter={userId}
        dimensions="w-full aspect-video"
        showChat={false}
        muted={true}
        showControls={false}
        showFullscreenButton={true}
        fallbackName={userName}
        userName={userName}
        className="border border-primary/20 rounded-lg"
        onFullscreen={onFullscreen}
      />

      {/* Inline Chat Overlay */}
      {showInlineChat && (
        <div className="absolute inset-x-0 bottom-20 z-40 max-h-64">
          <TabbedOverlayChat
            creatorId={creatorId}
            fanId={userId}
            isInQueue={true}
            className="h-full"
          />
        </div>
      )}
      
      {/* Bottom Overlay with Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-lg p-3 z-30">
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1">
            {discussionTopic && (
              <p className="text-xs text-white/90 mb-1 line-clamp-1">
                {discussionTopic}
              </p>
            )}
            {waitTime !== undefined && (
              <p className="text-xs text-white/70">
                Wait: {formatWaitTime(waitTime)}
              </p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Chat Toggle Button */}
            <Button
              size="sm"
              variant={showInlineChat ? "default" : "outline"}
              className={cn(
                "h-8 w-8 p-0",
                showInlineChat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-black/50 border-white/20 text-white hover:bg-black/70"
              )}
              onClick={() => setShowInlineChat(!showInlineChat)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>

            {/* Menu Button */}
            {onBroadcastToLobby && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-black/50 border-white/20 text-white hover:bg-black/70"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onBroadcastToLobby}>
                    <Radio className="w-4 h-4 mr-2" />
                    Broadcast to Lobby
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Start Call Button */}
            {onStartCall && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 px-4"
                onClick={onStartCall}
              >
                Start
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
