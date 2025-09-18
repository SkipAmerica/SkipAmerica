import { Button } from '@/components/ui/button';

import { Grid3X3, Heart, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type DiscoveryMode = 'grid' | 'cards' | 'schedule';

interface DiscoveryModeToggleProps {
  mode: DiscoveryMode;
  onModeChange: (mode: DiscoveryMode) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DiscoveryModeToggle = ({ mode, onModeChange, className, style }: DiscoveryModeToggleProps) => {
  return (
    <div
      style={style}
      className={cn(
        // Full-bleed, edge-to-edge container to remove any side padding from parents
        "flex items-center bg-muted overflow-hidden gap-0 w-[100dvw] max-w-none ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-0",
        className
      )}
    >
      <Button
        variant={mode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('cards')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all relative rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'cards' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Heart className="h-4 w-4" />
        <span>Discover</span>
      </Button>
      
      <Button
        variant={mode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('grid')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Grid3X3 className="h-4 w-4" />
        <span>Live</span>
      </Button>
      
      <Button
        variant={mode === 'schedule' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('schedule')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'schedule' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <List className="h-4 w-4" />
        <span>Schedule</span>
      </Button>
    </div>
  );
};