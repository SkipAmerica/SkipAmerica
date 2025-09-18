import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UserInterestFiltersProps {
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export function UserInterestFilters({ 
  selectedFilter: externalSelectedFilter, 
  onFilterChange 
}: UserInterestFiltersProps) {
  const [internalSelectedFilter, setInternalSelectedFilter] = useState('all');
  const selectedFilter = externalSelectedFilter ?? internalSelectedFilter;

  // Show default categories
  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'technology', label: 'Technology' },
    { id: 'business', label: 'Business' },
    { id: 'beauty', label: 'Beauty' }
  ];

  const handleFilterSelect = (filterId: string) => {
    if (onFilterChange) {
      onFilterChange(filterId);
    } else {
      setInternalSelectedFilter(filterId);
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
      {filterOptions.map((option) => (
        <Button
          key={option.id}
          variant={selectedFilter === option.id ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap flex-shrink-0 min-w-fit px-4 py-2"
          onClick={() => handleFilterSelect(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}