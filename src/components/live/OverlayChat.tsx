import React from "react";
import { UniversalChat } from '@/components/chat/UniversalChat';
import { createOverlayConfig } from '@/lib/chatConfigs';

type Props = {
  creatorId: string;
  className?: string;
};

export default function OverlayChat({ creatorId, className = "" }: Props) {
  const config = createOverlayConfig(creatorId);
  
  return (
    <div
      className={
        "absolute inset-x-0 bottom-0 h-40 z-20 pointer-events-none " + className
      }
      aria-hidden
    >
      <div className="absolute inset-y-3 right-3 left-1 overflow-y-auto flex flex-col gap-2 pointer-events-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <UniversalChat 
          config={{
            ...config,
            appearance: {
              ...config.appearance,
              className: "bg-transparent border-0"
            }
          }}
          className="bg-transparent"
        />
      </div>
    </div>
  );
}
