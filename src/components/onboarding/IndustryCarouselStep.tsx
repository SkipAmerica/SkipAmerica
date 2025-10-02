import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Music, Palette, Code, Camera, Utensils, Dumbbell, 
  Stethoscope, GraduationCap, Briefcase, Heart, 
  Gamepad2, Megaphone, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const INDUSTRIES = [
  { id: 'music', label: 'Music', icon: Music, gradient: 'from-purple-500 to-pink-500' },
  { id: 'art', label: 'Art & Design', icon: Palette, gradient: 'from-orange-500 to-red-500' },
  { id: 'tech', label: 'Technology', icon: Code, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'photography', label: 'Photography', icon: Camera, gradient: 'from-indigo-500 to-purple-500' },
  { id: 'food', label: 'Food & Cooking', icon: Utensils, gradient: 'from-yellow-500 to-orange-500' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, gradient: 'from-green-500 to-emerald-500' },
  { id: 'health', label: 'Health & Wellness', icon: Stethoscope, gradient: 'from-teal-500 to-cyan-500' },
  { id: 'education', label: 'Education', icon: GraduationCap, gradient: 'from-blue-500 to-indigo-500' },
  { id: 'business', label: 'Business', icon: Briefcase, gradient: 'from-gray-500 to-slate-500' },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart, gradient: 'from-pink-500 to-rose-500' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, gradient: 'from-violet-500 to-purple-500' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, gradient: 'from-amber-500 to-orange-500' },
];

interface IndustryCarouselStepProps {
  onComplete: (industries: string[]) => void;
  onSkip: () => void;
}

export function IndustryCarouselStep({ onComplete, onSkip }: IndustryCarouselStepProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);

  const handleSelect = (industryId: string) => {
    if (selected.includes(industryId)) {
      setSelected(selected.filter(id => id !== industryId));
    } else if (selected.length < 3) {
      setSelected([...selected, industryId]);
    } else {
      // Shake animation when trying to select 4th
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  const handleRemove = (industryId: string) => {
    setSelected(selected.filter(id => id !== industryId));
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    await onComplete(selected);
  };

  return (
    <div className="flex flex-col min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Choose Your Industries</h2>
          <p className="text-muted-foreground">
            Select up to 3 categories that best describe what you do
          </p>
        </div>

        {/* Selected Industries Bar */}
        {selected.length > 0 && (
          <div className={cn(
            "backdrop-blur-md bg-background/95 rounded-2xl p-4 border border-border/50 transition-all",
            shaking && "animate-[shake_0.5s_ease-in-out]"
          )}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">
                Selected ({selected.length}/3):
              </span>
              {selected.map(id => {
                const industry = INDUSTRIES.find(i => i.id === id);
                if (!industry) return null;
                const Icon = industry.icon;
                return (
                  <Badge
                    key={id}
                    className={cn(
                      "pl-2 pr-1 py-1 gap-2 animate-slide-up bg-gradient-to-r",
                      industry.gradient
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {industry.label}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Industry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {INDUSTRIES.map((industry) => {
            const Icon = industry.icon;
            const isSelected = selected.includes(industry.id);
            
            return (
              <button
                key={industry.id}
                onClick={() => handleSelect(industry.id)}
                className={cn(
                  "relative backdrop-blur-md bg-background/95 rounded-2xl p-6 border transition-all hover:scale-105 active:scale-95",
                  isSelected 
                    ? "border-primary shadow-lg shadow-primary/20" 
                    : "border-border/50 hover:border-primary/50"
                )}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-r",
                    industry.gradient,
                    "shadow-lg"
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-sm">{industry.label}</span>
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={handleContinue}
            disabled={selected.length === 0}
            size="lg"
            className="w-full"
          >
            Continue {selected.length > 0 && `(${selected.length} selected)`}
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="lg"
            className="w-full"
          >
            Skip for now
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {selected.length > 0 ? '100%' : '70%'} of profile completion
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
