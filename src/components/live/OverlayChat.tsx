import React, { useMemo } from "react";
import { useLobbyChat } from "@/hooks/useLobbyChat";

type Props = {
  creatorId: string;
  className?: string;
};

export default function OverlayChat({
  creatorId,
  className = "",
}: Props) {
  const msgs = useLobbyChat(creatorId);
  // newest-first for rendering (top pushes older down)
  const live = useMemo(() => [...msgs].reverse().slice(0, 50), [msgs]);

  return (
    <div
      className={
        "pointer-events-none absolute inset-0 flex items-end p-3 sm:p-4 z-[9999] " + className
      }
      aria-hidden
    >
      {/* stack from bottom, newest at top by reversing data */}
      <div className="w-full flex flex-col-reverse gap-2">
        {live.map((m) => (
          <div
            key={m.id}
            className="max-w-[80%] sm:max-w-[70%] bg-black/70 text-white rounded-2xl px-3 py-2 backdrop-blur"
          >
            <div className="text-[11px] opacity-80 leading-none">{m.username ?? "guest"}</div>
            <div className="text-sm sm:text-base break-words">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}