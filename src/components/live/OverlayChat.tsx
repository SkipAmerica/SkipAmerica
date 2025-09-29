import React from "react";
import { UniversalChat } from '@/components/chat/UniversalChat';
import { createOverlayConfig, createPrivateConfig } from '@/lib/chatConfigs';

type Props = {
  creatorId: string;
  chatMode?: 'lobby' | 'private';
  fanId?: string;
  className?: string;
  leftButton?: React.ReactNode;
};

export default function OverlayChat({ 
  creatorId, 
  chatMode = 'lobby',
  fanId,
  className = "",
  leftButton
}: Props) {
  const config = chatMode === 'private' && fanId
    ? createPrivateConfig(creatorId, fanId)
    : createOverlayConfig(creatorId);
  
  return (
    <div
      className={
        "absolute inset-x-0 bottom-0 h-64 z-20 pointer-events-none " + className
      }
      aria-hidden
    >
      <div className="absolute inset-y-0 top-3 right-0.5 left-0.5 overflow-y-auto flex flex-col gap-2 pointer-events-auto"
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
          leftButton={leftButton}
        />
      </div>
    </div>
  );
}
