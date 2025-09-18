import { useState, useMemo } from 'react'

export interface PaginationOptions {
  initialPage?: number
  initialPageSize?: number
  totalCount: number
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 20,
  totalCount,
}: PaginationOptions) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pageSize)
  }, [totalCount, pageSize])

  const hasNextPage = useMemo(() => {
    return page < totalPages
  }, [page, totalPages])

  const hasPreviousPage = useMemo(() => {
    return page > 1
  }, [page])

  const offset = useMemo(() => {
    return (page - 1) * pageSize
  }, [page, pageSize])

  const nextPage = () => {
    if (hasNextPage) {
      setPage(page + 1)
    }
  }

  const previousPage = () => {
    if (hasPreviousPage) {
      setPage(page - 1)
    }
  }

  const goToPage = (newPage: number) => {
    const clampedPage = Math.max(1, Math.min(newPage, totalPages))
    setPage(clampedPage)
  }

  const reset = () => {
    setPage(initialPage)
  }

  return {
    page,
    pageSize,
    totalPages,
    totalCount,
    offset,
    hasNextPage,
    hasPreviousPage,
    setPage: goToPage,
    setPageSize,
    nextPage,
    previousPage,
    reset,
  }
}