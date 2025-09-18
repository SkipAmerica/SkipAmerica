import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UserInterestFiltersProps {
  selectedFilters?: string[];
  onFiltersChange?: (filters: string[]) => void;
}

export function UserInterestFilters({ 
  selectedFilters: externalSelectedFilters, 
  onFiltersChange 
}: UserInterestFiltersProps) {
  const [internalSelectedFilters, setInternalSelectedFilters] = useState<string[]>(['all']);
  const selectedFilters = externalSelectedFilters ?? internalSelectedFilters;

  // Show default categories
  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'technology', label: 'Technology' },
    { id: 'business', label: 'Business' },
    { id: 'beauty', label: 'Beauty' }
  ];

  const handleFilterSelect = (filterId: string) => {
    let newSelectedFilters: string[];
    
    if (filterId === 'all') {
      // When "all" is clicked, select only "all" and deselect others
      newSelectedFilters = ['all'];
    } else {
      // Remove "all" if it was selected
      const currentFilters = selectedFilters.filter(f => f !== 'all');
      
      if (currentFilters.includes(filterId)) {
        // Deselect the filter
        newSelectedFilters = currentFilters.filter(f => f !== filterId);
        // If no filters left, select "all"
        if (newSelectedFilters.length === 0) {
          newSelectedFilters = ['all'];
        }
      } else {
        // Select the filter
        newSelectedFilters = [...currentFilters, filterId];
      }
    }
    
    if (onFiltersChange) {
      onFiltersChange(newSelectedFilters);
    } else {
      setInternalSelectedFilters(newSelectedFilters);
    }
  };

  return (
    <div 
      className="flex gap-1.5 overflow-x-auto user-interest-filters" 
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {filterOptions.map((option) => {
        const isSelected = selectedFilters.includes(option.id);
        return (
          <Button
            key={option.id}
            variant={isSelected ? "secondary" : "outline"}
            size="sm"
            className="whitespace-nowrap flex-shrink-0 min-w-fit px-4 py-2"
            onClick={() => handleFilterSelect(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}