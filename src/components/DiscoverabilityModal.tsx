import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function DiscoverabilityModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-lg border-white/30 dark:bg-black/40 dark:border-white/20 p-5 shadow-xl animate-scale-in">
        <div className="text-lg font-semibold mb-1 text-foreground">Discoverability On</div>
        <div className="text-sm text-muted-foreground mb-4">
          You are now available for incoming call requests.
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium border border-border hover:bg-accent text-foreground"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}