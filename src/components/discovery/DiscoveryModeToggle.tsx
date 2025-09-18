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
    <div className={cn("flex items-center space-x-1 p-1 bg-muted rounded-lg", className)}>
      <Button
        variant={mode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('cards')}
        className={cn(
          "flex items-center space-x-2 transition-all relative",
          mode === 'cards' ? "bg-background shadow-sm" : "hover:bg-background/50"
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
          "flex items-center space-x-2 transition-all",
          mode === 'grid' ? "bg-background shadow-sm" : "hover:bg-background/50"
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
          "flex items-center space-x-2 transition-all",
          mode === 'schedule' ? "bg-background shadow-sm" : "hover:bg-background/50"
        )}
      >
        <List className="h-4 w-4" />
        <span>Schedule</span>
      </Button>
    </div>
  );
};