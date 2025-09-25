import React, { useMemo, useRef, useEffect } from "react";
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
  // reverse() so newest is first in the array; we render normal column order.
  const live = useMemo(() => [...msgs].reverse(), [msgs]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // keep scroll pinned to top (where newest items appear)
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [live.length]);

  return (
    <div
      className={
        // allow interaction so users can scroll on creator view
        "pointer-events-auto absolute inset-0 flex items-end p-3 sm:p-4 z-[9999] " + className
      }
      aria-hidden
    >
      {/* anchored area above controls; scrollable; newest at top */}
      <div
        ref={listRef}
        className="ml-auto w-full sm:w-[70%] max-h-[50%] overflow-y-auto flex flex-col gap-2"
      >
        {live.map((m) => (
          <div
            key={m.id}
            className="max-w-[90%] bg-black/70 text-white rounded-2xl px-3 py-2 backdrop-blur"
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