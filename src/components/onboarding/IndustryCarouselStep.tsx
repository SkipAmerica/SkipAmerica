import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Music, Palette, Code, Camera, Utensils, Dumbbell, 
  Stethoscope, GraduationCap, Briefcase, Heart, 
  Gamepad2, Megaphone, X, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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

  const selectedIndustries = INDUSTRIES.filter(i => selected.includes(i.id));

  return (
    <div className="flex flex-col min-h-screen animate-fade-in relative">
      {/* Fixed Selection Bar at Top */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-background/60 border-b border-border/30 transition-all duration-500",
        selected.length > 0 ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}>
        <div className={cn(
          "max-w-4xl mx-auto p-4 transition-all duration-300",
          shaking && "animate-[shake_0.5s_ease-in-out]"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <span className={cn(
                "text-sm font-medium transition-all duration-300",
                selected.length === 0 && "text-muted-foreground",
                selected.length === 1 && "text-blue-500",
                selected.length === 2 && "text-blue-600",
                selected.length === 3 && "text-primary"
              )}>
                {selected.length === 0 ? "Choose your industries" : `${selected.length} of 3 selected`}
              </span>
              {selectedIndustries.map((industry, index) => {
                const Icon = industry.icon;
                return (
                  <div
                    key={industry.id}
                    className={cn(
                      "group relative flex items-center gap-2 px-3 py-1.5 rounded-full",
                      "backdrop-blur-xl bg-gradient-to-r border border-white/20",
                      "shadow-lg transition-all duration-300 animate-[slideInFromBottom_0.4s_ease-out]",
                      industry.gradient
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
                    <span className="text-xs font-medium text-white">{industry.label}</span>
                    <button
                      onClick={() => handleRemove(industry.id)}
                      className="ml-1 w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed bar */}
      <div className={cn(
        "transition-all duration-500",
        selected.length > 0 ? "h-20" : "h-0"
      )} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="w-full max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Choose Your Industries
            </h2>
            <p className="text-muted-foreground text-lg">
              Select up to 3 categories that best describe what you do
            </p>
          </div>

          {/* Premium Carousel */}
          <div className="relative py-8">
            <Carousel
              opts={{
                align: "center",
                loop: true,
                skipSnaps: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {INDUSTRIES.map((industry) => {
                  const Icon = industry.icon;
                  const isSelected = selected.includes(industry.id);
                  
                  return (
                    <CarouselItem key={industry.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                      <button
                        onClick={() => handleSelect(industry.id)}
                        className={cn(
                          "relative w-full h-64 rounded-3xl overflow-hidden",
                          "backdrop-blur-xl border transition-all duration-500",
                          "group hover:scale-105 active:scale-95",
                          "shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]",
                          isSelected 
                            ? "border-primary/50 shadow-[0_0_40px_rgba(var(--primary),0.3)] bg-background/40" 
                            : "border-border/30 hover:border-primary/30 bg-background/20"
                        )}
                      >
                        {/* Glass reflection overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
                        
                        {/* Content */}
                        <div className="relative h-full flex flex-col items-center justify-center gap-6 p-6">
                          {/* Icon with glow */}
                          <div className={cn(
                            "relative p-6 rounded-2xl bg-gradient-to-br transition-all duration-500",
                            "shadow-2xl group-hover:scale-110",
                            industry.gradient,
                            isSelected && "shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                          )}>
                            {/* Glow effect behind icon */}
                            <div className={cn(
                              "absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-50",
                              industry.gradient
                            )} />
                            <Icon className="relative w-12 h-12 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                          </div>
                          
                          {/* Label */}
                          <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg">{industry.label}</h3>
                            <p className="text-xs text-muted-foreground">
                              {isSelected ? "Selected" : "Tap to select"}
                            </p>
                          </div>
                        </div>
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary shadow-lg shadow-primary/50 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
                            <Check className="w-5 h-5 text-primary-foreground" />
                          </div>
                        )}
                        
                        {/* Bottom glow */}
                        <div className={cn(
                          "absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent",
                          "opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        )} />
                      </button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              
              {/* Navigation arrows */}
              <CarouselPrevious className="left-4 backdrop-blur-xl bg-background/60 border-border/30 hover:bg-background/80" />
              <CarouselNext className="right-4 backdrop-blur-xl bg-background/60 border-border/30 hover:bg-background/80" />
            </Carousel>
          </div>

          {/* Actions */}
          <div className="space-y-3 max-w-md mx-auto">
            <Button
              onClick={handleContinue}
              disabled={selected.length === 0}
              size="lg"
              className={cn(
                "w-full transition-all duration-300 relative overflow-hidden",
                selected.length === 0 && "opacity-50 cursor-not-allowed",
                selected.length > 0 && selected.length < 3 && "shadow-[0_0_20px_rgba(var(--primary),0.3)] animate-pulse",
                selected.length === 3 && "shadow-[0_0_30px_rgba(var(--primary),0.5)] scale-105"
              )}
            >
              {selected.length === 0 ? (
                "Select at least 1 industry"
              ) : (
                <>
                  Continue <span className="ml-2 font-bold">({selected.length} selected)</span>
                </>
              )}
            </Button>
            
            <Button
              onClick={onSkip}
              variant="ghost"
              size="lg"
              className="w-full hover:bg-background/50"
            >
              Skip for now
            </Button>
          </div>

          {/* Progress hint */}
          <div className="text-center">
            <p className={cn(
              "text-sm transition-all duration-300",
              selected.length === 0 && "text-muted-foreground",
              selected.length > 0 && selected.length < 3 && "text-blue-500",
              selected.length === 3 && "text-primary font-medium"
            )}>
              {selected.length === 0 && "Choose your first industry to continue"}
              {selected.length > 0 && selected.length < 3 && `${3 - selected.length} more to complete profile`}
              {selected.length === 3 && "✓ Profile complete!"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        
        @keyframes slideInFromBottom {
          0% {
            transform: translateY(20px) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
