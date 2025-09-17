import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Star, MapPin, Users, Clock, TrendingUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface Creator {
  id: string
  full_name: string
  headline: string
  bio: string
  avatar_url: string
  location_country: string
  location_city: string
  categories: string[]
  languages: string[]
  celebrity_tier: 'A' | 'B' | 'C' | 'Rising' | 'Local Hero'
  verification_status: 'verified' | 'pending' | 'failed'
  total_followers: number
  avg_engagement_rate: number
  base_rate_min: number
  base_rate_max: number
  base_rate_currency: string
  available_for_booking: boolean
  platform_stats: Array<{
    platform: string
    follower_count: number
    engagement_rate_30d: number
    handle: string
    verified_on_platform: boolean
  }>
  offer_rates: Array<{
    offer_type: string
    min_rate: number
    max_rate: number
    currency: string
  }>
}

interface SearchFilters {
  query: string
  categories: string[]
  celebrity_tier: string[]
  verification_status: string[]
  location_country: string
  languages: string[]
  min_budget: number
  max_budget: number
  min_followers: number
  max_followers: number
  min_engagement: number
  platforms: string[]
  offer_types: string[]
  available_only: boolean
  press_opt_in: boolean
  political_opt_in: boolean
  sort_by: 'relevance' | 'followers' | 'engagement' | 'recent' | 'rate_asc' | 'rate_desc'
}

export const AdvancedCreatorSearch: React.FC = () => {
  const { user } = useAuth()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(false)
  const [facets, setFacets] = useState<any>({})
  const [pagination, setPagination] = useState<any>({})
  const [filtersOpen, setFiltersOpen] = useState(true)
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    categories: [],
    celebrity_tier: [],
    verification_status: [],
    location_country: 'all',
    languages: [],
    min_budget: 0,
    max_budget: 1000,
    min_followers: 0,
    max_followers: 10000000,
    min_engagement: 0,
    platforms: [],
    offer_types: [],
    available_only: false,
    press_opt_in: false,
    political_opt_in: false,
    sort_by: 'relevance'
  })

  const searchCreators = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('creator-search', {
        body: { filters }
      })

      if (error) throw error

      setCreators(data.creators || [])
      setFacets(data.facets || {})
      setPagination(data.pagination || {})
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search creators')
    } finally {
      setLoading(false)
    }
  }, [user, filters])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchCreators()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchCreators])

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentValue = prev[key] as string[]
      return {
        ...prev,
        [key]: currentValue.includes(value)
          ? currentValue.filter((item: string) => item !== value)
          : [...currentValue, value]
      }
    })
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      categories: [],
      celebrity_tier: [],
      verification_status: [],
      location_country: 'all',
      languages: [],
      min_budget: 0,
      max_budget: 1000,
      min_followers: 0,
      max_followers: 10000000,
      min_engagement: 0,
      platforms: [],
      offer_types: [],
      available_only: false,
      press_opt_in: false,
      political_opt_in: false,
      sort_by: 'relevance'
    })
  }

  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'A': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 'B': return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
      case 'C': return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
      case 'Rising': return 'bg-gradient-to-r from-green-400 to-green-600 text-white'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Sign in to search creators</h2>
        <p className="text-muted-foreground">Access our advanced creator directory with powerful search and filtering.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Creator Search</h1>
          <p className="text-muted-foreground mt-2">
            Discover and connect with creators using advanced filters and search
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button onClick={clearFilters} variant="outline">
            Clear All
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search creators by name, category, or expertise..."
          value={filters.query}
          onChange={(e) => updateFilter('query', e.target.value)}
          className="pl-10 text-lg h-12"
        />
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="lg:col-span-1">
          <CollapsibleContent className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                
                {/* Sort By */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Sort By</label>
                  <Select value={filters.sort_by} onValueChange={(value) => updateFilter('sort_by', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="followers">Most Followers</SelectItem>
                      <SelectItem value="engagement">Highest Engagement</SelectItem>
                      <SelectItem value="recent">Recently Updated</SelectItem>
                      <SelectItem value="rate_asc">Lowest Rate</SelectItem>
                      <SelectItem value="rate_desc">Highest Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Categories</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {facets.categories?.map((category: string) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.categories.includes(category)}
                          onCheckedChange={() => toggleArrayFilter('categories', category)}
                        />
                        <label className="text-sm capitalize cursor-pointer">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Celebrity Tier */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Celebrity Tier</label>
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'Rising'].map((tier) => (
                      <div key={tier} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.celebrity_tier.includes(tier)}
                          onCheckedChange={() => toggleArrayFilter('celebrity_tier', tier)}
                        />
                        <Badge className={getTierColor(tier)}>
                          {tier}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Status */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Verification</label>
                  <div className="space-y-2">
                    {facets.verification_statuses?.map((status: string) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.verification_status.includes(status)}
                          onCheckedChange={() => toggleArrayFilter('verification_status', status)}
                        />
                        <label className="text-sm capitalize cursor-pointer">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Budget Range: ${filters.min_budget} - ${filters.max_budget}
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Min Budget</label>
                      <Slider
                        value={[filters.min_budget]}
                        onValueChange={([value]) => updateFilter('min_budget', value)}
                        max={1000}
                        step={25}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Budget</label>
                      <Slider
                        value={[filters.max_budget]}
                        onValueChange={([value]) => updateFilter('max_budget', value)}
                        max={1000}
                        step={25}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Follower Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Followers: {formatFollowerCount(filters.min_followers)} - {formatFollowerCount(filters.max_followers)}
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Min Followers</label>
                      <Slider
                        value={[filters.min_followers]}
                        onValueChange={([value]) => updateFilter('min_followers', value)}
                        max={10000000}
                        step={100000}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max Followers</label>
                      <Slider
                        value={[filters.max_followers]}
                        onValueChange={([value]) => updateFilter('max_followers', value)}
                        max={10000000}
                        step={100000}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Country</label>
                  <Select value={filters.location_country} onValueChange={(value) => updateFilter('location_country', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {facets.countries?.map((country: string) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Other Filters */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.available_only}
                      onCheckedChange={(checked) => updateFilter('available_only', checked)}
                    />
                    <label className="text-sm">Available for booking only</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.press_opt_in}
                      onCheckedChange={(checked) => updateFilter('press_opt_in', checked)}
                    />
                    <label className="text-sm">Has press mentions</label>
                  </div>
                </div>

              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-muted-foreground">
                {pagination.total || 0} creators found
                {filters.query && ` for "${filters.query}"`}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Creator Results */}
          {!loading && creators.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {creators.map((creator) => (
                <Card key={creator.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={creator.avatar_url} alt={creator.full_name} />
                        <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                            {creator.full_name}
                          </h3>
                          {creator.verification_status === 'verified' && (
                            <Star className="h-4 w-4 text-blue-500 fill-current" />
                          )}
                          <Badge className={getTierColor(creator.celebrity_tier)}>
                            {creator.celebrity_tier}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{creator.headline}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{creator.bio}</p>
                        
                        {/* Categories */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {creator.categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {creator.categories.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{creator.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatFollowerCount(creator.total_followers)}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {creator.avg_engagement_rate.toFixed(1)}%
                          </div>
                          {creator.location_country && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {creator.location_city}, {creator.location_country}
                            </div>
                          )}
                        </div>
                        
                        {/* Pricing */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-medium">
                              ${creator.base_rate_min} - ${creator.base_rate_max}
                            </span>
                            <span className="text-muted-foreground">/{creator.base_rate_currency}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              View Profile
                            </Button>
                            {creator.available_for_booking && (
                              <Button size="sm">
                                Book Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && creators.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No creators found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or filters to find more creators.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {!loading && creators.length > 0 && pagination.hasMore && (
            <div className="text-center mt-8">
              <Button
                onClick={() => {
                  // Load more logic would go here
                  toast.info('Load more functionality coming soon!')
                }}
                variant="outline"
              >
                Load More Creators
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
