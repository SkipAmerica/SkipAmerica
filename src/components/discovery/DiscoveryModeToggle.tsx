import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, Heart, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type DiscoveryMode = 'grid' | 'cards' | 'schedule';

interface DiscoveryModeToggleProps {
  mode: DiscoveryMode;
  onModeChange: (mode: DiscoveryMode) => void;
  className?: string;
}

export const DiscoveryModeToggle = ({ mode, onModeChange, className }: DiscoveryModeToggleProps) => {
  return (
    <div className={cn("flex w-full items-center bg-muted overflow-hidden", className)}>
      <Button
        variant={mode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('cards')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all relative rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'cards' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Heart className="h-4 w-4" />
        <span>Discover</span>
        <Badge variant="secondary" className="ml-1 h-5 text-xs bg-gradient-primary text-white border-0">
          New
        </Badge>
      </Button>
      
      <Button
        variant={mode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('grid')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
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
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          mode === 'schedule' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <List className="h-4 w-4" />
        <span>Schedule</span>
      </Button>
    </div>
  );
};