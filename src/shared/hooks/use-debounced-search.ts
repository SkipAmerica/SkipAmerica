// Performance-optimized search hook with debouncing
import { useMemo } from 'react'
import { useDebounce } from './use-debounce'
import { config } from '@/shared/config'

export function useDebouncedSearch(
  query: string,
  delay: number = config.ui.debounceMs
) {
  const debouncedQuery = useDebounce(query, delay)
  
  // Only trigger search if query is meaningful
  const shouldSearch = useMemo(() => {
    return debouncedQuery.length >= 2 || debouncedQuery.length === 0
  }, [debouncedQuery])
  
  const searchQuery = useMemo(() => {
    return shouldSearch ? debouncedQuery : ''
  }, [debouncedQuery, shouldSearch])
  
  return {
    searchQuery,
    isSearching: query !== debouncedQuery && query.length > 0,
    shouldSearch
  }
}