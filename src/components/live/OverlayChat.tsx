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
        "pointer-events-none absolute inset-0 z-20 " + className
      }
      aria-hidden
    >
      <div className="pointer-events-none absolute left-3 right-3 bottom-3 top-3 overflow-y-auto flex flex-col gap-2"
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
