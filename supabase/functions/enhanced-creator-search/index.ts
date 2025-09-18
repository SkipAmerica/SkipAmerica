import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { query = '', categories = [], availableOnly = false, limit = 50 } = await req.json();

    console.log('Enhanced creator search:', { query, categories, availableOnly, limit });

    // Start building the query
    let supabaseQuery = supabase
      .from('creators')
      .select(`
        *,
        platform_stats(*),
        offer_rates(*),
        creator_press_coverage(*)
      `)
      .eq('is_suppressed', false);

    // Apply text search across multiple fields
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      
      // Use OR condition to search across multiple text fields
      supabaseQuery = supabaseQuery.or(
        `full_name.ilike.%${searchTerm}%,` +
        `headline.ilike.%${searchTerm}%,` +
        `bio.ilike.%${searchTerm}%,` +
        `long_bio.ilike.%${searchTerm}%,` +
        `categories.cs.{${searchTerm}},` +
        `political_tags.cs.{${searchTerm}},` +
        `languages.cs.{${searchTerm}}`
      );
    }

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('categories', categories);
    }

    // Filter by availability if specified
    if (availableOnly) {
      supabaseQuery = supabaseQuery.eq('available_for_booking', true);
    }

    // Apply limit
    if (limit) {
      supabaseQuery = supabaseQuery.limit(limit);
    }

    // Order by relevance (can be enhanced with more sophisticated scoring)
    supabaseQuery = supabaseQuery.order('total_followers', { ascending: false });

    const { data: creators, error } = await supabaseQuery;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Enhanced search: also search in profiles table for industry specialization
    let profileMatches = [];
    if (query && query.trim()) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, industry_specialization, full_name')
        .or(`industry_specialization.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
        .eq('account_type', 'creator');

      if (!profileError && profiles) {
        profileMatches = profiles;
      }
    }

    // Enhanced search: search in press coverage for professional achievements
    let pressMatches = [];
    if (query && query.trim()) {
      const { data: press, error: pressError } = await supabase
        .from('creator_press_coverage')
        .select('creator_id, headline, article_content')
        .or(`headline.ilike.%${query.trim()}%,article_content.ilike.%${query.trim()}%`)
        .limit(100);

      if (!pressError && press) {
        pressMatches = press;
      }
    }

    // Merge results and remove duplicates
    const allCreatorIds = new Set([
      ...(creators || []).map(c => c.id),
      ...profileMatches.map(p => p.id),
      ...pressMatches.map(p => p.creator_id)
    ]);

    // If we found additional matches from profiles or press, fetch those creators too
    let additionalCreators = [];
    if (allCreatorIds.size > (creators || []).length) {
      const additionalIds = Array.from(allCreatorIds).filter(id => 
        !(creators || []).some(c => c.id === id)
      );

      if (additionalIds.length > 0) {
        const { data: additional } = await supabase
          .from('creators')
          .select(`
            *,
            platform_stats(*),
            offer_rates(*),
            creator_press_coverage(*)
          `)
          .in('id', additionalIds)
          .eq('is_suppressed', false);

        additionalCreators = additional || [];
      }
    }

    // Combine all results
    const allCreators = [...(creators || []), ...additionalCreators];

    // Enhanced relevance scoring based on search matches
    const scoredCreators = allCreators.map(creator => {
      let score = 0;
      const searchLower = (query || '').toLowerCase();

      if (searchLower) {
        // Name matches get highest score
        if (creator.full_name?.toLowerCase().includes(searchLower)) score += 10;
        
        // Headline/title matches
        if (creator.headline?.toLowerCase().includes(searchLower)) score += 8;
        
        // Bio matches
        if (creator.bio?.toLowerCase().includes(searchLower)) score += 6;
        if (creator.long_bio?.toLowerCase().includes(searchLower)) score += 6;
        
        // Category matches
        if (creator.categories?.some(cat => cat.toLowerCase().includes(searchLower))) score += 7;
        
        // Political/specialty tags
        if (creator.political_tags?.some(tag => tag.toLowerCase().includes(searchLower))) score += 5;
        
        // Language matches
        if (creator.languages?.some(lang => lang.toLowerCase().includes(searchLower))) score += 4;
        
        // Press coverage matches
        if (creator.creator_press_coverage?.some(press => 
          press.headline?.toLowerCase().includes(searchLower) ||
          press.article_content?.toLowerCase().includes(searchLower)
        )) score += 9;
        
        // Profile industry specialization match
        const profileMatch = profileMatches.find(p => p.id === creator.id);
        if (profileMatch?.industry_specialization?.toLowerCase().includes(searchLower)) score += 8;
      }

      // Boost score based on verification and follower count
      if (creator.verification_status === 'verified') score += 2;
      if (creator.total_followers > 1000000) score += 3;
      else if (creator.total_followers > 100000) score += 2;
      else if (creator.total_followers > 10000) score += 1;

      return { ...creator, relevance_score: score };
    });

    // Sort by relevance score when there's a query, otherwise by followers
    scoredCreators.sort((a, b) => {
      if (query && query.trim()) {
        return b.relevance_score - a.relevance_score;
      }
      return (b.total_followers || 0) - (a.total_followers || 0);
    });

    // Generate facets for filtering
    const facets = {
      categories: [...new Set(allCreators.flatMap(c => c.categories || []))].sort(),
      celebrity_tiers: [...new Set(allCreators.map(c => c.celebrity_tier).filter(Boolean))].sort(),
      verification_statuses: [...new Set(allCreators.map(c => c.verification_status).filter(Boolean))].sort(),
      countries: [...new Set(allCreators.map(c => c.location_country).filter(Boolean))].sort(),
      languages: [...new Set(allCreators.flatMap(c => c.languages || []))].sort(),
    };

    return new Response(JSON.stringify({
      creators: scoredCreators.slice(0, limit),
      facets,
      total: scoredCreators.length,
      pagination: {
        total: scoredCreators.length,
        limit,
        hasMore: scoredCreators.length > limit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced creator search error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      creators: [],
      facets: {},
      total: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});