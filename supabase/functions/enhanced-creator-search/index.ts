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

    // Start building the query - get ALL creators first
    let supabaseQuery = supabase
      .from('creators')
      .select(`
        *,
        platform_stats(*),
        offer_rates(*),
        creator_press_coverage(*),
        press_mentions(*)
      `)
      .eq('is_suppressed', false);

    // Apply comprehensive text search across ALL applicable fields
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      
      // Search across ALL text fields in creators table
      supabaseQuery = supabaseQuery.or(
        `full_name.ilike.%${searchTerm}%,` +
        `headline.ilike.%${searchTerm}%,` +
        `bio.ilike.%${searchTerm}%,` +
        `long_bio.ilike.%${searchTerm}%,` +
        `location_country.ilike.%${searchTerm}%,` +
        `location_city.ilike.%${searchTerm}%,` +
        `celebrity_tier.ilike.%${searchTerm}%,` +
        `verification_status.ilike.%${searchTerm}%,` +
        `categories.cs.{${searchTerm}},` +
        `political_tags.cs.{${searchTerm}},` +
        `languages.cs.{${searchTerm}},` +
        `risk_flags.cs.{${searchTerm}}`
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

    // Enhanced search: search across ALL related tables
    let profileMatches = [];
    let pressMatches = [];
    let platformMatches = [];
    let offerMatches = [];
    let socialAnalysisMatches = [];
    
    if (query && query.trim()) {
      const searchTerm = query.trim();
      
      // Search in profiles table for industry specialization and interests
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, industry_specialization, full_name, bio, interests')
        .or(`industry_specialization.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%,interests.cs.{${searchTerm.toLowerCase()}}`)
        .eq('account_type', 'creator');

      if (!profileError && profiles) {
        profileMatches = profiles;
      }

      // Search in creator press coverage
      const { data: press, error: pressError } = await supabase
        .from('creator_press_coverage')
        .select('creator_id, title, publication, article_content')
        .or(`title.ilike.%${searchTerm}%,publication.ilike.%${searchTerm}%,article_content.ilike.%${searchTerm}%`)
        .limit(200);

      if (!pressError && press) {
        pressMatches = press;
      }

      // Search in platform stats for handles and platforms
      const { data: platforms, error: platformError } = await supabase
        .from('platform_stats')
        .select('creator_id, platform, handle')
        .or(`platform.ilike.%${searchTerm}%,handle.ilike.%${searchTerm}%`)
        .limit(200);

      if (!platformError && platforms) {
        platformMatches = platforms;
      }

      // Search in offer rates for offer types
      const { data: offers, error: offerError } = await supabase
        .from('offer_rates')
        .select('creator_id, offer_type, notes')
        .or(`offer_type.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
        .limit(200);

      if (!offerError && offers) {
        offerMatches = offers;
      }

      // Search in creator social analysis
      const { data: socialAnalysis, error: socialError } = await supabase
        .from('creator_social_analysis')
        .select('creator_id, platform')
        .ilike('platform', `%${searchTerm}%`)
        .limit(200);

      if (!socialError && socialAnalysis) {
        socialAnalysisMatches = socialAnalysis;
      }

      // Search in press mentions
      const { data: pressMentions, error: pressMentionsError } = await supabase
        .from('press_mentions')
        .select('creator_id, headline, outlet')
        .or(`headline.ilike.%${searchTerm}%,outlet.ilike.%${searchTerm}%`)
        .limit(200);

      if (!pressMentionsError && pressMentions) {
        pressMatches = [...pressMatches, ...pressMentions];
      }
    }

    // Merge results and remove duplicates from ALL search sources
    const allCreatorIds = new Set([
      ...(creators || []).map(c => c.id),
      ...profileMatches.map(p => p.id),
      ...pressMatches.map(p => p.creator_id),
      ...platformMatches.map(p => p.creator_id),
      ...offerMatches.map(p => p.creator_id),
      ...socialAnalysisMatches.map(p => p.creator_id)
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
            creator_press_coverage(*),
            press_mentions(*)
          `)
          .in('id', additionalIds)
          .eq('is_suppressed', false);

        additionalCreators = additional || [];
      }
    }

    // Combine all results
    const allCreators = [...(creators || []), ...additionalCreators];

    // Enhanced relevance scoring based on ALL search matches
    const scoredCreators = allCreators.map(creator => {
      let score = 0;
      const searchLower = (query || '').toLowerCase();

      if (searchLower) {
        // Primary creator fields (highest scores)
        if (creator.full_name?.toLowerCase().includes(searchLower)) score += 15;
        if (creator.headline?.toLowerCase().includes(searchLower)) score += 12;
        if (creator.bio?.toLowerCase().includes(searchLower)) score += 10;
        if (creator.long_bio?.toLowerCase().includes(searchLower)) score += 10;
        
        // Location matches
        if (creator.location_country?.toLowerCase().includes(searchLower)) score += 8;
        if (creator.location_city?.toLowerCase().includes(searchLower)) score += 8;
        
        // Category and specialty matches
        if (creator.categories?.some(cat => cat.toLowerCase().includes(searchLower))) score += 11;
        if (creator.political_tags?.some(tag => tag.toLowerCase().includes(searchLower))) score += 7;
        if (creator.languages?.some(lang => lang.toLowerCase().includes(searchLower))) score += 6;
        if (creator.risk_flags?.some(flag => flag.toLowerCase().includes(searchLower))) score += 5;
        
        // Celebrity tier and verification
        if (creator.celebrity_tier?.toLowerCase().includes(searchLower)) score += 9;
        if (creator.verification_status?.toLowerCase().includes(searchLower)) score += 8;
        
        // Related tables matches
        const profileMatch = profileMatches.find(p => p.id === creator.id);
        if (profileMatch?.industry_specialization?.toLowerCase().includes(searchLower)) score += 12;
        if (profileMatch?.interests?.some(interest => interest.toLowerCase().includes(searchLower))) score += 8;
        
        // Press coverage matches
        if (pressMatches.some(press => press.creator_id === creator.id)) score += 11;
        
        // Platform matches
        if (platformMatches.some(platform => platform.creator_id === creator.id)) score += 9;
        
        // Offer type matches
        if (offerMatches.some(offer => offer.creator_id === creator.id)) score += 8;
        
        // Social analysis matches  
        if (socialAnalysisMatches.some(social => social.creator_id === creator.id)) score += 7;
      }

      // Base scoring factors
      if (creator.verification_status === 'verified') score += 3;
      if (creator.total_followers > 10000000) score += 5;
      else if (creator.total_followers > 1000000) score += 4;
      else if (creator.total_followers > 100000) score += 3;
      else if (creator.total_followers > 10000) score += 2;
      else if (creator.total_followers > 1000) score += 1;

      // Celebrity tier bonus
      if (creator.celebrity_tier === 'World Wide') score += 4;
      else if (creator.celebrity_tier === 'National') score += 3;
      else if (creator.celebrity_tier === 'Regional') score += 2;
      else if (creator.celebrity_tier === 'Local') score += 1;

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

    console.log(`Found ${scoredCreators.length} creators total`);

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