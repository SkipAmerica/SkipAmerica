// Performance-optimized paginated query hook
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { config } from '@/shared/config'

interface PaginatedResponse<TData> {
  data: TData[]
  total: number
  page: number
  hasMore: boolean
}

interface PaginatedQueryOptions<TData> {
  queryKey: readonly unknown[]
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<PaginatedResponse<TData>>
  pageSize?: number
  enabled?: boolean
}

export function usePaginatedQuery<TData>({
  queryKey,
  queryFn,
  pageSize = config.ui.defaultPageSize,
  enabled = true
}: PaginatedQueryOptions<TData>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn({ pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: PaginatedResponse<TData>) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined
    },
    enabled,
    staleTime: config.cache.staleTime,
  })

  // Flatten all pages into a single array
  const items = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? []
  }, [data])

  // Calculate total count
  const totalCount = useMemo(() => {
    return data?.pages[0]?.total ?? 0
  }, [data])

  // Calculate if all items are loaded
  const allItemsLoaded = useMemo(() => {
    return items.length >= totalCount
  }, [items.length, totalCount])

  return {
    items,
    totalCount,
    hasNextPage,
    allItemsLoaded,
    isLoading,
    isFetchingNextPage,
    error,
    fetchNextPage,
    refetch,
  }
}