import { Button } from '@/components/ui/button';

import { Grid3X3, Heart, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type DiscoveryMode = 'discover' | 'browse' | 'match';

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

  // Calculate the sliding indicator position
  const getSlidePosition = () => {
    switch (mode) {
      case 'discover': return '0%';
      case 'browse': return '33.333%';
      case 'match': return '66.666%';
      default: return '0%';
    }
  };

  return (
    <div
      style={style}
      className={cn(
        "relative flex items-center bg-muted overflow-hidden gap-0 w-full px-0 rounded-none border-b border-border h-12",
        className
      )}
    >
      {/* Sliding background indicator */}
      <div 
        className="absolute top-0 left-0 h-full w-1/3 bg-primary transition-transform duration-300 ease-out z-0"
        style={{
          transform: `translateX(${getSlidePosition()})`
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('discover')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-colors duration-300 relative rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 z-10",
          mode === 'discover' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Search className="h-4 w-4" />
        <span>Discover</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('browse')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-colors duration-300 relative rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 z-10",
          mode === 'browse' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Grid3X3 className="h-4 w-4" />
        <span>Browse</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('match')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-colors duration-300 relative rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 z-10",
          mode === 'match' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Heart className="h-4 w-4" />
        <span>Match</span>
      </Button>
    </div>
  );
};