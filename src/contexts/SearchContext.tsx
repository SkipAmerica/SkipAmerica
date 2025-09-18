import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useCreatorSearch as useCreatorSearchHook } from '@/hooks/useCreatorSearch';

interface SearchFilters {
  query: string;
  categories: string[];
  availableOnly: boolean;
  priceRange: [number, number];
  sortBy: 'rating' | 'price_low' | 'price_high' | 'response_time' | 'popular' | 'online';
  selectedCategory: string; // For legacy compatibility
}

interface SearchContextType {
  // Search state
  filters: SearchFilters;
  
  // Search results
  creators: any[];
  loading: boolean;
  error: string | null;
  
  // Actions
  updateQuery: (query: string) => void;
  updateCategories: (categories: string[]) => void;
  updateSelectedCategory: (category: string) => void;
  updateAvailableOnly: (availableOnly: boolean) => void;
  updatePriceRange: (range: [number, number]) => void;
  updateSortBy: (sortBy: SearchFilters['sortBy']) => void;
  clearSearch: () => void;
  resetFilters: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const defaultFilters: SearchFilters = {
  query: '',
  categories: [],
  availableOnly: false,
  priceRange: [0, 1000],
  sortBy: 'rating',
  selectedCategory: 'all'
};

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  // Use the existing useCreatorSearch hook with our global state
  const { creators, loading, error } = useCreatorSearchHook({
    query: filters.query,
    categories: filters.selectedCategory === 'all' ? [] : [filters.selectedCategory],
    availableOnly: filters.availableOnly,
    limit: 100
  });

  const updateQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, query }));
  }, []);

  const updateCategories = useCallback((categories: string[]) => {
    setFilters(prev => ({ ...prev, categories }));
  }, []);

  const updateSelectedCategory = useCallback((category: string) => {
    setFilters(prev => ({ 
      ...prev, 
      selectedCategory: category,
      categories: category === 'all' ? [] : [category]
    }));
  }, []);

  const updateAvailableOnly = useCallback((availableOnly: boolean) => {
    setFilters(prev => ({ ...prev, availableOnly }));
  }, []);

  const updatePriceRange = useCallback((range: [number, number]) => {
    setFilters(prev => ({ ...prev, priceRange: range }));
  }, []);

  const updateSortBy = useCallback((sortBy: SearchFilters['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const clearSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, query: '' }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const value: SearchContextType = {
    filters,
    creators,
    loading,
    error,
    updateQuery,
    updateCategories,
    updateSelectedCategory,
    updateAvailableOnly,
    updatePriceRange,
    updateSortBy,
    clearSearch,
    resetFilters
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}