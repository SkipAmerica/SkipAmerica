import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserVideoSFU } from '@/components/shared/UserVideoSFU';
import { cn } from '@/lib/utils';

interface NextUserPreviewProps {
  userId: string; // The fan whose video we're viewing
  creatorId: string;
  userName?: string;
  discussionTopic?: string;
  waitTime?: number;
  onStartCall?: () => void;
  onFullscreen?: () => void;
}

export function NextUserPreview({
  userId,
  creatorId,
  userName = 'Anonymous User',
  discussionTopic,
  waitTime,
  onStartCall,
  onFullscreen
}: NextUserPreviewProps) {
  const [showNotification, setShowNotification] = useState(true);

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
        className="border border-primary/20 rounded-lg"
        onFullscreen={onFullscreen}
      />
      
      {/* Bottom Overlay with Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-lg p-3">
        <div className="flex items-end justify-between">
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
          {onStartCall && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 ml-3 px-4 shrink-0"
              onClick={onStartCall}
            >
              Start
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
