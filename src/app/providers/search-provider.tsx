// Consolidated search provider
import React, { createContext, useContext, useState } from 'react'
import { useDebounce } from '@/shared/hooks'

interface SearchState {
  query: string
  selectedCategory: string
  sortBy: 'relevance' | 'rating' | 'price' | 'availability'
  filters: {
    minPrice?: number
    maxPrice?: number
    isOnline?: boolean
    isAvailable?: boolean
    location?: string
    verified?: boolean
  }
}

interface SearchContextType {
  // State
  filters: SearchState
  debouncedQuery: string
  
  // Actions
  updateQuery: (query: string) => void
  updateSelectedCategory: (category: string) => void
  updateSortBy: (sortBy: SearchState['sortBy']) => void
  updateFilters: (filters: Partial<SearchState['filters']>) => void
  resetFilters: () => void
  
  // Derived state
  hasActiveFilters: boolean
}

const defaultState: SearchState = {
  query: '',
  selectedCategory: 'all',
  sortBy: 'relevance',
  filters: {},
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

interface SearchProviderProps {
  children: React.ReactNode
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [filters, setFilters] = useState<SearchState>(defaultState)
  const debouncedQuery = useDebounce(filters.query, 300)

  const updateQuery = (query: string) => {
    setFilters(prev => ({ ...prev, query }))
  }

  const updateSelectedCategory = (selectedCategory: string) => {
    setFilters(prev => ({ ...prev, selectedCategory }))
  }

  const updateSortBy = (sortBy: SearchState['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }))
  }

  const updateFilters = (newFilters: Partial<SearchState['filters']>) => {
    setFilters(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }))
  }

  const resetFilters = () => {
    setFilters(defaultState)
  }

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.selectedCategory !== 'all' ||
    filters.sortBy !== 'relevance' ||
    Object.keys(filters.filters).length > 0
  )

  const value: SearchContextType = {
    filters,
    debouncedQuery,
    updateQuery,
    updateSelectedCategory,
    updateSortBy,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  }

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}