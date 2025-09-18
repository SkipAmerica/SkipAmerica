import { Button } from '@/components/ui/button';

import { Grid3X3, Heart, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type DiscoveryMode = 'grid' | 'cards' | 'schedule' | 'search';

interface DiscoveryModeToggleProps {
  mode: DiscoveryMode;
  onModeChange: (mode: DiscoveryMode) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DiscoveryModeToggle = ({ mode, onModeChange, className, style }: DiscoveryModeToggleProps) => {
  console.log('DiscoveryModeToggle render - current mode:', mode);
  
  const handleModeChange = (newMode: DiscoveryMode) => {
    console.log('DiscoveryModeToggle - changing from', mode, 'to', newMode);
    onModeChange(newMode);
  };

  return (
    <div
      style={style}
      className={cn(
        "flex items-center bg-muted overflow-hidden gap-0 w-full px-0",
        className
      )}
    >
      <Button
        variant={mode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleModeChange('cards')}
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
        onClick={() => handleModeChange('grid')}
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
        onClick={() => handleModeChange('schedule')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'schedule' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <List className="h-4 w-4" />
        <span>Schedule</span>
      </Button>
      
      <Button
        variant={mode === 'search' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleModeChange('search')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'search' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
      </Button>
    </div>
  );
};