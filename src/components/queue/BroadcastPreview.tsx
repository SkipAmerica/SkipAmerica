import React from "react";
import { Video, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type BroadcastPreviewProps = {
  className?: string;
};

export function BroadcastPreview({ className }: BroadcastPreviewProps) {
  return (
    <div className={cn("relative bg-background rounded-lg overflow-hidden", className)}>
      {/* Video Placeholder */}
      <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
        {/* Broadcast Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-full backdrop-blur-sm">
          <Radio className="h-3 w-3 animate-pulse" />
          <span className="text-xs font-medium">LIVE</span>
        </div>

        {/* Center Icon */}
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Video className="h-16 w-16" strokeWidth={1.5} />
          <div className="text-center">
            <p className="text-sm font-medium">Broadcasting to Lobby</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Your camera will appear here</p>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Lobby Broadcast Mode</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visible to all waiting fans
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
