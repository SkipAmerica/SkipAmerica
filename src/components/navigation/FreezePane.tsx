import React from 'react';
import { cn } from '@/lib/utils';
import { DiscoveryModeToggle } from '@/features/discovery/components/discovery-mode-toggle';
import { BrowseSubTabs } from '@/components/discovery/BrowseSubTabs';
import { IOSSearchBar } from '@/components/mobile/IOSSearchBar';
import { UserInterestFilters } from '@/components/UserInterestFilters';
import { isWebBrowser } from '@/shared/lib/platform';
import { useDiscovery } from '@/app/providers/discovery-provider';

type DiscoveryMode = 'discover' | 'browse' | 'match';
type BrowseMode = 'live' | 'schedule';

interface FreezePaneProps {
  // Discovery Mode Toggle
  showDiscoveryToggle: boolean;
  
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

export const FreezePane = React.memo(function FreezePane({
  showDiscoveryToggle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search creators...",
  showInterestFilters,
  selectedFilters,
  onFiltersChange,
  className
}: FreezePaneProps) {
  const { discoveryMode, browseMode, setBrowseMode, handleDiscoveryModeChange } = useDiscovery();
  const showBrowseSubTabs = discoveryMode === 'browse';
  return (
    <div 
      className={cn(
        "freeze-pane-stable z-50 w-full overflow-x-hidden bg-background/85 backdrop-blur-md border-b border-border",
        className
      )}
    >
      {/* Discovery Mode Toggle */}
      {showDiscoveryToggle && (
        <DiscoveryModeToggle
          mode={discoveryMode}
          onModeChange={handleDiscoveryModeChange}
        />
      )}
      
      {/* Browse Sub Tabs */}
      {showBrowseSubTabs && (
        <div className="px-4 pt-2">
          <BrowseSubTabs 
            mode={browseMode}
            onModeChange={setBrowseMode}
          />
        </div>
      )}
      
      {/* Search Bar - Only show in browse mode */}
      {discoveryMode === 'browse' && (
        <div className="pb-1">
          <IOSSearchBar
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            fullWidth
          />
        </div>
      )}
      
      {/* Interest Filters - Only show in browse mode */}
      {showInterestFilters && discoveryMode === 'browse' && (
        <div className="px-4 pb-1">
          <UserInterestFilters 
            selectedFilters={selectedFilters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}
    </div>
  );
});