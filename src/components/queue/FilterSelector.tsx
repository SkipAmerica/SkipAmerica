import { Sparkles, Sun, Snowflake, Star, Zap, X, Gem, Cloud, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import type { FilterPreset } from '@/lib/advancedFilterProcessor';

interface FilterSelectorProps {
  currentFilter: FilterPreset;
  onFilterChange: (filter: FilterPreset) => void;
  className?: string;
}

const FILTERS: Array<{ 
  id: FilterPreset; 
  label: string; 
  icon: React.ReactNode;
  description: string;
}> = [
  // Tone-based filters first
  { 
    id: 'bright', 
    label: 'Bright', 
    icon: <Sun className="w-4 h-4" />,
    description: 'Sun-kissed'
  },
  { 
    id: 'cool', 
    label: 'Cool', 
    icon: <Snowflake className="w-4 h-4" />,
    description: 'Cool tone'
  },
  { 
    id: 'radiant', 
    label: 'Radiant', 
    icon: <Zap className="w-4 h-4" />,
    description: 'Golden glow'
  },
  // Skin enhancement filters
  { 
    id: 'natural', 
    label: 'Natural', 
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Balanced look'
  },
  { 
    id: 'porcelain', 
    label: 'Porcelain', 
    icon: <Gem className="w-4 h-4" />,
    description: 'Ultra smooth'
  },
  { 
    id: 'softfocus', 
    label: 'Soft Focus', 
    icon: <Cloud className="w-4 h-4" />,
    description: 'Dreamy blur'
  },
  // Clarity filters
  { 
    id: 'glam', 
    label: 'Glam', 
    icon: <Star className="w-4 h-4" />,
    description: 'Red carpet'
  },
  { 
    id: 'hdclear', 
    label: 'HD Clear', 
    icon: <Focus className="w-4 h-4" />,
    description: 'Max detail'
  },
  // None at the end
  { 
    id: 'none', 
    label: 'None', 
    icon: <X className="w-4 h-4" />,
    description: 'Original'
  },
];

export function FilterSelector({ currentFilter, onFilterChange, className }: FilterSelectorProps) {
  return (
    <div className={cn("bg-black/40 backdrop-blur-sm rounded-full p-2", className)}>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
          containScroll: "trimSnaps",
        }}
        className="w-full cursor-grab active:cursor-grabbing"
      >
        <CarouselContent className="-ml-2">
          {FILTERS.map((filter) => (
            <CarouselItem key={filter.id} className="pl-2 basis-auto">
              <button
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  "group relative flex items-center gap-2 px-4 py-2 rounded-full",
                  "transition-all duration-200 flex-shrink-0",
                  "hover:bg-white/20",
                  currentFilter === filter.id
                    ? "bg-white/30 text-white"
                    : "bg-white/10 text-white/70"
                )}
                title={filter.description}
              >
                {filter.icon}
                <span className="text-sm font-medium">{filter.label}</span>
                
                {/* Active indicator */}
                {currentFilter === filter.id && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white animate-pulse" />
                )}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
