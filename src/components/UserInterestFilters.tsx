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
      // When "all" is clicked, select only "all"
      newSelectedFilters = ['all'];
    } else {
      // Single selection - only one industry at a time
      newSelectedFilters = [filterId];
    }
    
    if (onFiltersChange) {
      onFiltersChange(newSelectedFilters);
    } else {
      setInternalSelectedFilters(newSelectedFilters);
    }
  };

  // Separate "All" from other categories
  const allOption = filterOptions.find(option => option.id === 'all')!;
  const industryOptions = filterOptions.filter(option => option.id !== 'all');

  return (
    <div className="flex gap-1.5">
      {/* Fixed "All" button */}
      <Button
        variant={selectedFilters.includes(allOption.id) ? "secondary" : "outline"}
        size="sm"
        className="whitespace-nowrap flex-shrink-0 min-w-fit px-4 py-2"
        onClick={() => handleFilterSelect(allOption.id)}
      >
        {allOption.label}
      </Button>
      
      {/* Scrollable industry options */}
      <div 
        className="flex gap-1.5 overflow-x-auto user-interest-filters" 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {industryOptions.map((option) => {
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
    </div>
  );
}