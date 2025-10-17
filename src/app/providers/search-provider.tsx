// Consolidated search provider
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useDebounce } from '@/shared/hooks/use-debounce'

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

  const updateQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, query }))
  }, [])

  const updateSelectedCategory = useCallback((selectedCategory: string) => {
    setFilters(prev => ({ ...prev, selectedCategory }))
  }, [])

  const updateSortBy = useCallback((sortBy: SearchState['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }))
  }, [])

  const updateFilters = useCallback((newFilters: Partial<SearchState['filters']>) => {
    setFilters(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultState)
  }, [])

  const hasActiveFilters = useMemo(() => Boolean(
    filters.query ||
    filters.selectedCategory !== 'all' ||
    filters.sortBy !== 'relevance' ||
    Object.keys(filters.filters).length > 0
  ), [filters.query, filters.selectedCategory, filters.sortBy, filters.filters])

  const value: SearchContextType = useMemo(() => ({
    filters,
    debouncedQuery,
    updateQuery,
    updateSelectedCategory,
    updateSortBy,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  }), [filters, debouncedQuery, updateQuery, updateSelectedCategory, updateSortBy, updateFilters, resetFilters, hasActiveFilters])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    // Non-fatal fallback to prevent app crash
    if (import.meta.env.DEV && !(window as any).__SEARCH_PROVIDER_WARNED__) {
      console.error('[SearchProvider] Missing provider - using safe fallback. This should not happen in normal operation.')
      ;(window as any).__SEARCH_PROVIDER_WARNED__ = true
    }
    // Safe fallback to keep UI alive (no-ops)
    return {
      filters: { ...defaultState },
      debouncedQuery: '',
      updateQuery: () => {},
      updateSelectedCategory: () => {},
      updateSortBy: () => {},
      updateFilters: () => {},
      resetFilters: () => {},
      hasActiveFilters: false,
    } as SearchContextType
  }
  return context
}