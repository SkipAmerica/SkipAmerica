// Discovery feature types
export type DiscoveryMode = 'discover' | 'browse' | 'match'
export type BrowseMode = 'live' | 'schedule'

export interface DiscoveryFilters {
  query: string
  selectedCategory: string
  sortBy: 'relevance' | 'rating' | 'price' | 'availability'
  showOnlineOnly: boolean
  showAvailableOnly: boolean
  priceRange: [number, number] | null
  location: string | null
  verifiedOnly: boolean
}

export interface CreatorSearchResult {
  id: string
  full_name: string
  bio?: string
  avatar_url?: string
  categories: string[]
  base_rate_min?: number
  base_rate_max?: number
  is_online: boolean
  available_for_booking: boolean
  rating: number
  ratings_count: number
  verification_status: string
  celebrity_tier: string
}