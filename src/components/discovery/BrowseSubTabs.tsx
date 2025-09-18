import { Button } from '@/components/ui/button';
import { Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrowseMode = 'live' | 'schedule';

interface BrowseSubTabsProps {
  mode: BrowseMode;
  onModeChange: (mode: BrowseMode) => void;
  className?: string;
}

export const BrowseSubTabs = ({ mode, onModeChange, className }: BrowseSubTabsProps) => {
  return (
    <div className={cn(
      "flex items-center bg-muted overflow-hidden gap-0 w-full px-0 rounded-lg border border-border h-10 mx-4 mb-4",
      className
    )}>
      <Button
        variant={mode === 'live' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('live')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-r-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8",
          mode === 'live' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Users className="h-4 w-4" />
        <span>Live</span>
      </Button>
      
      <Button
        variant={mode === 'schedule' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('schedule')}
        className={cn(
          "flex-1 flex items-center justify-center space-x-2 transition-all rounded-l-none px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8",
          mode === 'schedule' ? "bg-primary text-primary-foreground" : "hover:bg-background/50"
        )}
      >
        <Calendar className="h-4 w-4" />
        <span>Schedule</span>
      </Button>
    </div>
  );
};