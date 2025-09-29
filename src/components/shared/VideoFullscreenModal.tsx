import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserVideoSFU } from './UserVideoSFU';

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black border-0 [&>button]:bg-white/20 [&>button]:text-white [&>button]:hover:bg-white/30 [&>button]:opacity-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Fullscreen Video - {userName}</DialogTitle>
        </DialogHeader>
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