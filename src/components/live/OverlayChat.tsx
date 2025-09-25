import React, { useEffect, useRef } from "react";
import { useLobbyChat } from "@/hooks/useLobbyChat";

type Props = {
  creatorId: string;
  className?: string;
};

export default function OverlayChat({
  creatorId,
  className = "",
}: Props) {
  const { messages, loading } = useLobbyChat(creatorId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Auto-scroll to bottom when new messages arrive (only if user was already at bottom)
  useEffect(() => {
    if (scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Track if user is at bottom for auto-scroll behavior
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottomRef.current = scrollTop + clientHeight >= scrollHeight - 10;
    }
  };

  if (loading) {
    return (
      <div
        className={
          "pointer-events-none absolute inset-0 flex items-center justify-center z-[9999] " + className
        }
        aria-hidden
      >
        <div className="bg-black/50 text-white rounded-lg px-3 py-2 text-sm">
          Loading chat...
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "absolute inset-0 flex flex-col z-[9999] " + className
      }
      aria-hidden
    >
      {/* Scrollable chat area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 pointer-events-auto"
        style={{ 
          // Custom scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent'
        }}
      >
        <div className="flex flex-col gap-2 min-h-full justify-end">
          {messages.map((m) => (
            <div
              key={m.id}
              className="max-w-[80%] sm:max-w-[70%] bg-black/70 text-white rounded-2xl px-3 py-2 backdrop-blur self-start flex items-start gap-2"
            >
              {/* Profile picture */}
              <div className="flex-shrink-0 mt-1">
                {m.avatarUrl ? (
                  <img 
                    src={m.avatarUrl} 
                    alt={m.username ?? "User"} 
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium">
                    {(m.username ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Message content */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] opacity-80 leading-none mb-1">{m.username ?? "guest"}</div>
                <div className="text-sm sm:text-base break-words">{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient overlay at bottom for visual fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}