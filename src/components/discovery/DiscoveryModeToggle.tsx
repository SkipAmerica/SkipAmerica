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
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('discover')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all relative rounded-none px-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent hover:bg-transparent",
          mode === 'discover' 
            ? "text-[#00C2D8] font-semibold border-b-2 border-[#00C2D8]" 
            : "text-muted-foreground font-normal border-b-2 border-transparent"
        )}
      >
        <Search className="h-4 w-4" />
        <span>For You</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('browse')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all relative rounded-none px-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent hover:bg-transparent",
          mode === 'browse' 
            ? "text-[#00C2D8] font-semibold border-b-2 border-[#00C2D8]" 
            : "text-muted-foreground font-normal border-b-2 border-transparent"
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
          "flex-1 flex items-center justify-center space-x-2 transition-all relative rounded-none px-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent hover:bg-transparent",
          mode === 'match' 
            ? "text-[#00C2D8] font-semibold border-b-2 border-[#00C2D8]" 
            : "text-muted-foreground font-normal border-b-2 border-transparent"
        )}
      >
        <Handshake className="h-4 w-4" />
        <span>Match</span>
      </Button>
    </div>
  );
};