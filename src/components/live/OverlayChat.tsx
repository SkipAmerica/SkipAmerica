import React, { useMemo, useRef, useEffect } from "react";
import { useLobbyChat } from "@/hooks/useLobbyChat";

type Props = {
  creatorId: string;
  className?: string;
};

export default function OverlayChat({ creatorId, className = "" }: Props) {
  const msgs = useLobbyChat(creatorId);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Render newest first (top), older below it
  const ordered = useMemo(() => {
    // slice() to avoid mutating state array
    const list = msgs.slice().reverse();
    return list;
  }, [msgs]);

  // Optional: auto-scroll to top so newest stays visible if container grows
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // keep scroll at top so newest (top) is visible
    el.scrollTo({ top: 0, behavior: "instant" as any });
  }, [ordered.length]);

  return (
    <div
      className={
        "pointer-events-none absolute inset-0 z-20 " + className
      }
      aria-hidden
    >
      <div
        ref={wrapRef}
        className="pointer-events-none absolute left-3 right-3 bottom-3 top-3 overflow-y-auto flex flex-col gap-2"
        style={{ scrollbarWidth: "none" }}
      >
        {ordered.length === 0 ? (
          <div className="text-white/80 text-sm">No messages yet…</div>
        ) : (
          ordered.map((m) => (
            <div
              key={m.id}
              className="max-w-[90%] bg-black/55 text-white rounded-2xl px-3 py-2 backdrop-blur"
            >
              <div className="text-[11px] opacity-80 leading-none">
                {m.username ?? "guest"}
              </div>
              <div className="text-sm sm:text-base break-words">
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
