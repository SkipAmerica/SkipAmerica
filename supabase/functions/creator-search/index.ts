import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

interface SearchFilters {
  query?: string
  categories?: string[]
  celebrity_tier?: string[]
  verification_status?: string[]
  location_country?: string
  languages?: string[]
  min_budget?: number
  max_budget?: number
  min_followers?: number
  max_followers?: number
  min_engagement?: number
  platforms?: string[]
  offer_types?: string[]
  available_only?: boolean
  press_opt_in?: boolean
  political_opt_in?: boolean
  sort_by?: 'relevance' | 'followers' | 'engagement' | 'recent' | 'rate_asc' | 'rate_desc'
  page?: number
  limit?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters }: { filters: SearchFilters } = await req.json()
    
    // Build the base query
    let query = supabase
      .from('creators')
      .select(`
        *,
        platform_stats(platform, follower_count, engagement_rate_30d, handle, verified_on_platform),
        offer_rates(offer_type, min_rate, max_rate, currency),
        press_mentions(outlet, headline, published_date),
        creator_onboarding!inner(search_unlocked)
      `)
      .eq('is_suppressed', false)
      .eq('creator_onboarding.search_unlocked', true)

    // Apply text search if query provided
    if (filters.query) {
      const searchTerms = filters.query.trim().split(' ').filter(Boolean)
      const searchConditions = searchTerms.map(term => 
        `full_name.ilike.%${term}%,headline.ilike.%${term}%,bio.ilike.%${term}%,categories.cs.{${term}}`
      ).join(',')
      query = query.or(searchConditions)
    }

    // Apply category filter
    if (filters.categories?.length) {
      query = query.overlaps('categories', filters.categories)
    }

    // Apply celebrity tier filter
    if (filters.celebrity_tier?.length) {
      query = query.in('celebrity_tier', filters.celebrity_tier)
    }

    // Apply verification status filter
    if (filters.verification_status?.length) {
      query = query.in('verification_status', filters.verification_status)
    }

    // Apply location filter
    if (filters.location_country) {
      query = query.eq('location_country', filters.location_country)
    }

    // Apply languages filter
    if (filters.languages?.length) {
      query = query.overlaps('languages', filters.languages)
    }

    // Apply budget filters
    if (filters.min_budget !== undefined) {
      query = query.lte('base_rate_min', filters.min_budget)
    }
    if (filters.max_budget !== undefined) {
      query = query.gte('base_rate_max', filters.max_budget)
    }

    // Apply follower filters
    if (filters.min_followers !== undefined) {
      query = query.gte('total_followers', filters.min_followers)
    }
    if (filters.max_followers !== undefined) {
      query = query.lte('total_followers', filters.max_followers)
    }

    // Apply engagement filter
    if (filters.min_engagement !== undefined) {
      query = query.gte('avg_engagement_rate', filters.min_engagement)
    }

    // Apply availability filter
    if (filters.available_only) {
      query = query.eq('available_for_booking', true)
    }

    // Apply privacy filters - respect opt-in settings
    if (filters.press_opt_in !== undefined) {
      query = query.eq('press_opt_in', filters.press_opt_in)
    }

    if (filters.political_opt_in !== undefined) {
      query = query.eq('political_opt_in', filters.political_opt_in)
    }

    // Apply sorting
    switch (filters.sort_by) {
      case 'followers':
        query = query.order('total_followers', { ascending: false })
        break
      case 'engagement':
        query = query.order('avg_engagement_rate', { ascending: false })
        break
      case 'recent':
        query = query.order('updated_at', { ascending: false })
        break
      case 'rate_asc':
        query = query.order('base_rate_min', { ascending: true })
        break
      case 'rate_desc':
        query = query.order('base_rate_min', { ascending: false })
        break
      default:
        // Default relevance-based sorting
        query = query
          .order('verification_status', { ascending: false })
          .order('avg_engagement_rate', { ascending: false })
          .order('total_followers', { ascending: false })
    }

    // Apply pagination
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 50, 100) // Cap at 100 results
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: creators, error, count } = await query

    if (error) {
      console.error('Search error:', error)
      return new Response(
        JSON.stringify({ error: 'Search failed', details: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Process results to respect privacy settings
    const processedCreators = creators?.map(creator => {
      const processed = { ...creator }
      
      // Remove political tags if not opted in
      if (!creator.political_opt_in) {
        processed.political_tags = []
      }
      
      // Remove press mentions if not opted in
      if (!creator.press_opt_in) {
        processed.press_mentions = []
        processed.press_mentions_30d = 0
        processed.press_mentions_total = 0
      }
      
      return processed
    }) || []

    // Calculate facets for filtering
    const { data: facetData } = await supabase
      .from('creators')
      .select('categories, celebrity_tier, verification_status, location_country, languages')
      .eq('is_suppressed', false)

    const facets = {
      categories: [...new Set(facetData?.flatMap(c => c.categories) || [])],
      celebrity_tiers: [...new Set(facetData?.map(c => c.celebrity_tier) || [])],
      verification_statuses: [...new Set(facetData?.map(c => c.verification_status) || [])],
      countries: [...new Set(facetData?.map(c => c.location_country).filter(Boolean) || [])],
      languages: [...new Set(facetData?.flatMap(c => c.languages) || [])]
    }

    return new Response(
      JSON.stringify({
        creators: processedCreators,
        facets,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > offset + limit
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})