import React from 'react';
import { cn } from '@/lib/utils';
import { DiscoveryModeToggle } from '@/components/discovery/DiscoveryModeToggle';
import { BrowseSubTabs } from '@/components/discovery/BrowseSubTabs';
import { IOSSearchBar } from '@/components/mobile/IOSSearchBar';
import { UserInterestFilters } from '@/components/UserInterestFilters';
import { useKeyboardAware } from '@/hooks/use-keyboard-aware';

type DiscoveryMode = 'discover' | 'browse' | 'match';
type BrowseMode = 'live' | 'schedule';

interface FreezePaneProps {
  // Discovery Mode Toggle
  showDiscoveryToggle: boolean;
  discoveryMode: DiscoveryMode;
  onDiscoveryModeChange: (mode: DiscoveryMode) => void;
  
  // Browse Sub Tabs
  showBrowseSubTabs: boolean;
  browseMode: BrowseMode;
  onBrowseModeChange: (mode: BrowseMode) => void;
  
  // Search Bar
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Interest Filters
  showInterestFilters: boolean;
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  
  // Layout
  className?: string;
}

export const FreezePane = ({
  showDiscoveryToggle,
  discoveryMode,
  onDiscoveryModeChange,
  showBrowseSubTabs,
  browseMode,
  onBrowseModeChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search creators...",
  showInterestFilters,
  selectedFilters,
  onFiltersChange,
  className
}: FreezePaneProps) => {
  const { isKeyboardVisible, getKeyboardAwareSafeTop } = useKeyboardAware();

  return (
    <div 
      className={cn(
        "z-50 w-full overflow-x-hidden bg-background/85 backdrop-blur-md border-b border-border",
        isKeyboardVisible ? "fixed" : "sticky",
        className
      )}
      style={{ 
        top: 'var(--safe-area-top)',
        transform: 'translateZ(0)',
        willChange: isKeyboardVisible ? 'transform, top' : 'auto',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* Discovery Mode Toggle */}
      {showDiscoveryToggle && (
        <DiscoveryModeToggle
          mode={discoveryMode}
          onModeChange={onDiscoveryModeChange}
        />
      )}
      
      {/* Browse Sub Tabs */}
      {showBrowseSubTabs && (
        <div className="px-4 pt-2">
          <BrowseSubTabs 
            mode={browseMode}
            onModeChange={onBrowseModeChange}
          />
        </div>
      )}
      
      {/* Search Bar */}
      <div className="pb-1">
        <IOSSearchBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          fullWidth
        />
      </div>
      
      {/* Interest Filters */}
      {showInterestFilters && (
        <div className="px-4 pb-1">
          <UserInterestFilters 
            selectedFilters={selectedFilters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}
    </div>
  );
};