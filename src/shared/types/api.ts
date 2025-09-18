// API-related types and response shapes
export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

// Query and mutation types for React Query
export interface QueryConfig {
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
}

export interface MutationConfig<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: ApiError, variables: TVariables) => void
  onSettled?: (data: TData | undefined, error: ApiError | null, variables: TVariables) => void
}

// Common API filters and sorting
export interface BaseFilters {
  search?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface CreatorFilters extends BaseFilters {
  categories?: string[]
  minRate?: number
  maxRate?: number
  isOnline?: boolean
  isAvailable?: boolean
  location?: string
  verifiedOnly?: boolean
}

export interface AppointmentFilters extends BaseFilters {
  status?: string[]
  dateFrom?: string
  dateTo?: string
  creatorId?: string
  fanId?: string
}

// WebRTC and real-time types
export interface CallSession {
  id: string
  creatorId: string
  fanId: string
  status: 'waiting' | 'active' | 'ended'
  startedAt?: string
  endedAt?: string
  duration?: number
  cost?: number
}

export interface CallParticipant {
  id: string
  name: string
  avatar?: string
  isHost: boolean
  isMuted: boolean
  hasVideo: boolean
}