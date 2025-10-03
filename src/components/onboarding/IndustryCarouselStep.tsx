import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Music, Palette, Code, Camera, Utensils, Dumbbell, 
  Stethoscope, GraduationCap, Briefcase, Heart, 
  Gamepad2, Megaphone, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';

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
  const [animatingCard, setAnimatingCard] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();

  const handleSelect = (industryId: string) => {
    if (selected.includes(industryId)) {
      // Toggle off - deselect the industry
      handleRemove(industryId);
      return;
    }
    
    if (selected.length >= 3) {
      // Shake animation when trying to select 4th
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }

    // Animate card flying upward
    setAnimatingCard(industryId);
    setTimeout(() => {
      setSelected([...selected, industryId]);
      setAnimatingCard(null);
    }, 400);
  };

  const handleRemove = (industryId: string) => {
    setSelected(selected.filter(id => id !== industryId));
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    await onComplete(selected);
  };

  const selectedIndustries = INDUSTRIES.filter(i => selected.includes(i.id));

  return (
    <div className="flex flex-col min-h-screen animate-fade-in relative bg-gradient-splash overflow-y-auto">
      {/* Fixed Selection Bar at Top */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/10 border-b border-white/20 transition-all duration-500",
        selected.length > 0 ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}>
        <div className={cn(
          "w-full px-6 py-6 transition-all duration-300",
          shaking && "animate-[shake_0.5s_ease-in-out]"
        )}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80">My Industries</h3>
              <span className={cn(
                "text-sm font-bold transition-colors duration-300",
                selected.length === 1 && "text-white/90",
                selected.length === 2 && "text-white/95",
                selected.length === 3 && "text-white"
              )}>
                {selected.length} of 3
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap min-h-[44px]">
              {selectedIndustries.map((industry, index) => {
                const Icon = industry.icon;
                return (
                  <div
                    key={industry.id}
                    className={cn(
                      "group relative flex items-center gap-2 px-4 py-2 rounded-2xl",
                      "backdrop-blur-xl bg-gradient-to-r border border-white/20",
                      "shadow-[0_0_20px_rgba(0,0,0,0.1)] hover:shadow-[0_0_30px_rgba(0,0,0,0.2)]",
                      "transition-all duration-300 animate-[chipScaleIn_0.4s_ease-out]",
                      industry.gradient
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Glow effect */}
                    <div className={cn(
                      "absolute inset-0 rounded-2xl bg-gradient-to-r opacity-50 blur-lg",
                      industry.gradient
                    )} />
                    
                    <Icon className="relative w-4 h-4 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                    <span className="relative text-sm font-semibold text-white drop-shadow-md">
                      {industry.label}
                    </span>
                    <button
                      onClick={() => handleRemove(industry.id)}
                      className="relative ml-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 
                               flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                );
              })}
              {selected.length === 0 && (
                <p className="text-sm text-white/70 italic">
                  Tap a card below to add it here
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed bar */}
      <div className={cn(
        "transition-all duration-500",
        selected.length > 0 ? "h-32" : "h-0"
      )} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-white">
              Choose Your Industries
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Select up to 3 categories that best describe what you do. Swipe through the wheel to explore all options.
            </p>
          </div>

          {/* Horizontal Wheel Carousel */}
          <div className="relative">
            <Carousel
              opts={{
                align: "center",
                loop: true,
                skipSnaps: false,
                dragFree: true,
              }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {INDUSTRIES.map((industry) => {
                  const Icon = industry.icon;
                  const isSelected = selected.includes(industry.id);
                  const isAnimating = animatingCard === industry.id;
                  
                  return (
                    <CarouselItem 
                      key={industry.id} 
                      className="pl-2 md:pl-4 basis-4/5 sm:basis-3/5 md:basis-2/5 lg:basis-1/3"
                    >
                      <button
                        onClick={() => handleSelect(industry.id)}
                        disabled={isAnimating}
                        className={cn(
                          "relative w-full h-80 rounded-3xl overflow-hidden",
                          "backdrop-blur-2xl border-2 transition-all duration-500",
                          "shadow-2xl hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)]",
                          "disabled:cursor-default",
                          isSelected && "opacity-50 scale-95",
                          isAnimating && "animate-[flyUp_0.4s_ease-in-out] pointer-events-none",
                          !isSelected && !isAnimating && "hover:scale-105 active:scale-100 cursor-pointer",
                          isSelected 
                            ? "border-white/20 bg-white/5" 
                            : "border-white/30 hover:border-white/50 bg-white/10"
                        )}
                      >
                        {/* Glass reflection overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                        
                        {/* Gradient glow background */}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-br opacity-20 transition-opacity duration-500",
                          industry.gradient,
                          !isSelected && !isAnimating && "group-hover:opacity-30"
                        )} />

                        {/* Content */}
                        <div className="relative h-full flex flex-col items-center justify-center gap-8 p-8">
                          {/* Icon with animated glow */}
                          <div className={cn(
                            "relative p-8 rounded-3xl bg-gradient-to-br transition-all duration-500",
                            "shadow-2xl",
                            industry.gradient,
                            !isSelected && !isAnimating && "hover:scale-110 hover:rotate-6"
                          )}>
                            {/* Glow effect behind icon */}
                            <div className={cn(
                              "absolute inset-0 rounded-3xl bg-gradient-to-br blur-2xl opacity-60",
                              industry.gradient
                            )} />
                            
                            <Icon className="relative w-16 h-16 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                          </div>
                          
                          {/* Label */}
                          <div className="text-center space-y-3">
                            <h3 className="font-bold text-2xl tracking-tight text-white">
                              {industry.label}
                            </h3>
                            <p className={cn(
                              "text-sm font-medium transition-colors duration-300",
                              isSelected ? "text-white/60" : "text-white/90"
                            )}>
                              {isSelected ? "Tap to deselect" : "Tap to select"}
                            </p>
                          </div>
                        </div>

                        {/* Bottom gradient fade */}
                        <div className={cn(
                          "absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/10 to-transparent",
                          "opacity-0 transition-opacity duration-500",
                          !isSelected && !isAnimating && "group-hover:opacity-100"
                        )} />
                      </button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>

            {/* Center indicator line */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-full 
                          bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none" />
          </div>

          {/* Helper Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-white/70">
              <span className="inline-block mr-2">👈👉</span>
              Swipe or drag to explore all industries
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 max-w-md mx-auto">
            <Button
              onClick={handleContinue}
              disabled={selected.length === 0}
              size="lg"
              className={cn(
                "w-full transition-all duration-300 relative overflow-hidden group bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 backdrop-blur-sm",
                selected.length === 0 && "opacity-50 cursor-not-allowed",
                selected.length > 0 && selected.length < 3 && "shadow-[0_0_20px_rgba(255,255,255,0.3)]",
                selected.length === 3 && "shadow-[0_0_40px_rgba(255,255,255,0.6)] scale-105"
              )}
            >
              <span className="relative z-10">
                {selected.length === 0 ? (
                  "Select at least 1 industry"
                ) : (
                  <>
                    Continue
                    {selected.length === 3 && " ✨"}
                  </>
                )}
              </span>
              {selected.length === 3 && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 
                              animate-[shimmer_2s_ease-in-out_infinite]" />
              )}
            </Button>
            
            <Button
              onClick={onSkip}
              variant="ghost"
              size="lg"
              className="w-full text-white hover:bg-white/10"
            >
              Skip for now
            </Button>
          </div>

          {/* Progress hint */}
          <div className="text-center">
            <p className={cn(
              "text-sm font-medium transition-all duration-300",
              selected.length === 0 && "text-white/70",
              selected.length > 0 && selected.length < 3 && "text-white/85",
              selected.length === 3 && "text-white"
            )}>
              {selected.length === 0 && "Choose your first industry to get started"}
              {selected.length > 0 && selected.length < 3 && `Add ${3 - selected.length} more to complete your profile`}
              {selected.length === 3 && "✓ Profile complete! Ready to continue"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        
        @keyframes chipScaleIn {
          0% {
            transform: translateY(300px) scale(1.5);
            opacity: 0;
          }
          60% {
            transform: translateY(-10px) scale(1);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes flyUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-400px) scale(0.3);
            opacity: 0;
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
