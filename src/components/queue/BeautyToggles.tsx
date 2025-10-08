import { Eye, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeautyTogglesProps {
  eyeEnhance: boolean;
  teethWhiten: boolean;
  onEyeEnhanceToggle: (enabled: boolean) => void;
  onTeethWhitenToggle: (enabled: boolean) => void;
  className?: string;
}

export function BeautyToggles({ 
  eyeEnhance, 
  teethWhiten, 
  onEyeEnhanceToggle, 
  onTeethWhitenToggle,
  className 
}: BeautyTogglesProps) {
  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      <button
        onClick={() => onEyeEnhanceToggle(!eyeEnhance)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all",
          eyeEnhance 
            ? "bg-white/30 text-white backdrop-blur-sm" 
            : "bg-white/10 text-white/60 hover:bg-white/20 backdrop-blur-sm"
        )}
      >
        <Eye className="w-4 h-4" />
        Eyes
      </button>
      <button
        onClick={() => onTeethWhitenToggle(!teethWhiten)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all",
          teethWhiten 
            ? "bg-white/30 text-white backdrop-blur-sm" 
            : "bg-white/10 text-white/60 hover:bg-white/20 backdrop-blur-sm"
        )}
      >
        <Smile className="w-4 h-4" />
        Teeth
      </button>
    </div>
  );
}
