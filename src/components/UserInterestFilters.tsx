import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useAuth } from '@/hooks/useAuth';

export function UserInterestFilters() {
  const { user } = useAuth();
  const { userInterests, getUserInterestLabels } = useUserInterests();
  const [selectedFilter, setSelectedFilter] = useState('all');

  // If user is not logged in or has no interests, show default categories
  const getFilterOptions = () => {
    if (!user || userInterests.length === 0) {
      return [
        { id: 'all', label: 'All' },
        { id: 'entertainment', label: 'Entertainment' },
        { id: 'technology', label: 'Technology' },
        { id: 'business', label: 'Business' },
        { id: 'beauty', label: 'Beauty' }
      ];
    }

    // Show user's interests plus "All"
    const userInterestLabels = getUserInterestLabels();
    return [
      { id: 'all', label: 'All' },
      ...userInterests.slice(0, 4).map((interest, index) => ({
        id: interest,
        label: userInterestLabels[index] || interest
      }))
    ];
  };

  const filterOptions = getFilterOptions();

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
      {filterOptions.map((option) => (
        <Button
          key={option.id}
          variant={selectedFilter === option.id ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap flex-shrink-0"
          onClick={() => setSelectedFilter(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}