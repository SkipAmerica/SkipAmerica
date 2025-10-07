import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { cn } from '@/lib/utils';

interface NextUserPreviewProps {
  userId: string;
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
    console.log(`[NextUserPreview] 📺 Target Room: lobby_${creatorId}`);
  }, [userId, creatorId]);

  return (
    <div className="relative w-full">
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
      <div className="border border-primary/20 rounded-lg overflow-hidden">
        <LiveKitVideoPlayer
          config={{
            role: 'viewer',
            creatorId: creatorId,
            identity: `viewer_${creatorId}`,
          }}
          className="w-full aspect-video object-cover bg-black"
          muted={true}
          fallbackContent={
            <div className="flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
                <p className="text-sm">Loading {userName}'s video...</p>
              </div>
            </div>
          }
        />
      </div>
      
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
