import { Button } from '@/components/ui/button';

import { Grid3X3, Handshake, Search } from 'lucide-react';
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

  return (
    <div
      style={style}
      className={cn(
        "flex items-center bg-white overflow-hidden gap-0 w-full px-0 rounded-none border-t border-b border-border h-12",
        className
      )}
    >
      <Button
        variant={mode === 'discover' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleModeChange('discover')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all relative rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12",
          mode === 'discover' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Search className="h-4 w-4" />
        <span>For You</span>
      </Button>
      
      <Button
        variant={mode === 'browse' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleModeChange('browse')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12",
          mode === 'browse' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Grid3X3 className="h-4 w-4" />
        <span>Browse</span>
      </Button>
      
      <Button
        variant={mode === 'match' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleModeChange('match')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12",
          mode === 'match' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Handshake className="h-4 w-4" />
        <span>Match</span>
      </Button>
    </div>
  );
};