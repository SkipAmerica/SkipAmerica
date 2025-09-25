import React, { useEffect, useMemo, useState } from "react";
import { useLobbyChat } from "@/hooks/useLobbyChat";

type Props = {
  creatorId: string;
  visibleMs?: number;  // full opacity duration
  fadeMs?: number;     // fade out duration
  maxShown?: number;   // max bubbles on screen
  className?: string;
};

export default function OverlayChat({
  creatorId,
  visibleMs = 4000,
  fadeMs = 1200,
  maxShown = 8,
  className = "",
}: Props) {
  const msgs = useLobbyChat(creatorId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, []);

  const live = useMemo(() => {
    const win = visibleMs + fadeMs;
    return msgs
      .slice(-maxShown * 3)
      .filter((m) => now - m.ts < win)
      .slice(-maxShown);
  }, [msgs, now, visibleMs, fadeMs, maxShown]);

  return (
    <div
      className={
        "pointer-events-none absolute inset-0 flex items-end p-3 sm:p-4 z-20 " + className
      }
      aria-hidden
    >
      <div className="w-full flex flex-col gap-2">
        {live.map((m) => {
          const age = now - m.ts;
          const opacity =
            age <= visibleMs ? 1 :
            age >= visibleMs + fadeMs ? 0 :
            1 - (age - visibleMs) / fadeMs;

          return (
            <div
              key={m.id}
              className="max-w-[80%] sm:max-w-[70%] bg-black/55 text-white rounded-2xl px-3 py-2 backdrop-blur"
              style={{ opacity, transition: "opacity 300ms linear" }}
            >
              <div className="text-[11px] opacity-80 leading-none">{m.username ?? "guest"}</div>
              <div className="text-sm sm:text-base break-words">{m.text}</div>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32 bg-gradient-to-t from-black/40 to-transparent z-[-1]" />
    </div>
  );
}