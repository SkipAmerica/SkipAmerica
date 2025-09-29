import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserVideoSFU } from './UserVideoSFU';
import { cn } from '@/lib/utils';

interface VideoFullscreenModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  creatorId?: string;
}

export function VideoFullscreenModal({
  userId,
  isOpen,
  onClose,
  userName = "Creator",
  creatorId
}: VideoFullscreenModalProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShowNotification(true);
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const swipeDistance = touchEnd - touchStart;
    
    // Downward swipe (positive distance) > 100px
    if (swipeDistance > 100) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 bg-black border-0 [&>button]:bg-white/20 [&>button]:text-white [&>button]:hover:bg-white/30 [&>button]:opacity-100 [&>button]:w-12 [&>button]:h-12 [&>button>svg]:w-6 [&>button>svg]:h-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Fullscreen Video - {userName}</DialogTitle>
        </DialogHeader>
        
        {/* Privacy Notification */}
        <div className={cn(
          "absolute top-8 left-1/2 -translate-x-1/2 z-50",
          "bg-black/70 backdrop-blur-sm px-6 py-3 rounded-full",
          "border border-white/20 text-white text-sm font-medium",
          "transition-opacity duration-1000",
          showNotification ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {userName} cannot see you
        </div>

        <div className="w-full h-full">
          <UserVideoSFU
            userId={userId}
            role="viewer"
            dimensions="w-full h-full"
            showChat={true}
            chatMode={creatorId ? "private" : "lobby"}
            fanId={creatorId ? userId : undefined}
            showControls={true}
            className="rounded-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}