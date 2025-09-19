import React from 'react';
import { cn } from '@/lib/utils';
import { DiscoveryModeToggle } from '@/components/discovery/DiscoveryModeToggle';
import { BrowseSubTabs } from '@/components/discovery/BrowseSubTabs';
import { IOSSearchBar } from '@/components/mobile/IOSSearchBar';
import { UserInterestFilters } from '@/components/UserInterestFilters';

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
  return (
    <div 
      className={cn(
        "sticky z-50 w-full overflow-x-hidden bg-background/85 backdrop-blur-md border-b border-border",
        className
      )}
      style={{ top: 'var(--safe-area-top)' }}
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