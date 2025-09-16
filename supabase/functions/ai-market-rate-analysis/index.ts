import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { creator_id } = await req.json();
    
    if (!creator_id) {
      throw new Error('Creator ID is required');
    }

    console.log('Starting market rate analysis for creator:', creator_id);

    // Fetch creator profile and social data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', creator_id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch creator profile: ${profileError.message}`);
    }

    // Fetch social analysis data
    const { data: socialData } = await supabaseAdmin
      .from('creator_social_analysis')
      .select('*')
      .eq('creator_id', creator_id);

    // Fetch press coverage
    const { data: pressData } = await supabaseAdmin
      .from('creator_press_coverage')
      .select('*')
      .eq('creator_id', creator_id)
      .order('published_date', { ascending: false })
      .limit(10);

    // Fetch performance metrics
    const { data: performanceData } = await supabaseAdmin
      .from('call_performance_metrics')
      .select('*')
      .eq('creator_id', creator_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Analyze competitors in the same space
    const { data: competitors } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, 
        full_name, 
        account_type,
        creator_call_pricing(price_per_block, duration_minutes),
        creator_social_analysis(platform, follower_count, engagement_rate)
      `)
      .eq('account_type', 'creator')
      .neq('id', creator_id)
      .limit(20);

    // Prepare AI analysis prompt
    const analysisPrompt = `
    Analyze this creator's market value for video call pricing on a platform like Skip (similar to Cameo but for live calls).

    Creator Profile:
    - Name: ${profile.full_name}
    - Bio: ${profile.bio || 'No bio available'}
    - Verified: ${profile.is_verified}

    Social Media Presence:
    ${socialData?.map(social => `
    - ${social.platform}: ${social.follower_count} followers, ${social.engagement_rate}% engagement rate
    - Influence Score: ${social.influence_score}/100
    - Account Quality: ${social.audience_quality_score}/100
    `).join('') || 'No social data available'}

    Recent Press Coverage:
    ${pressData?.map(press => `
    - ${press.publication || 'Unknown'}: "${press.title}" (Sentiment: ${press.sentiment_score}, Impact: ${press.impact_score}/100)
    `).join('') || 'No press coverage data'}

    Platform Performance:
    ${performanceData?.map(perf => `
    - Period: ${perf.period_start} to ${perf.period_end}
    - Total Calls: ${perf.total_calls}, Revenue: $${perf.total_revenue}
    - Caller Velocity: ${perf.caller_velocity} calls/hour
    - Conversion Rate: ${perf.conversion_rate}%
    - Price Sensitivity: ${perf.price_sensitivity_score}/100
    `).join('') || 'No performance data available'}

    Similar Creators' Pricing:
    ${competitors?.slice(0, 10).map(comp => {
      const pricing = comp.creator_call_pricing?.[0];
      const social = comp.creator_social_analysis?.[0];
      return `
      - ${comp.full_name}: $${pricing?.price_per_block || 'Unknown'} per ${pricing?.duration_minutes || 30} min
        Social: ${social?.follower_count || 0} followers, ${social?.engagement_rate || 0}% engagement
      `;
    }).join('') || 'No competitor data available'}

    Based on this data, provide a comprehensive pricing analysis. Consider:
    1. Social media influence and engagement quality over follower count
    2. Press coverage and public recognition
    3. Platform performance and demand patterns
    4. Competitive landscape positioning
    5. Price elasticity based on caller behavior

    Respond in JSON format with:
    {
      "suggested_price_per_minute": number,
      "confidence_score": number (0-100),
      "market_position": "premium" | "mid-tier" | "budget",
      "competitor_analysis": [
        {
          "name": string,
          "price_comparison": "higher" | "lower" | "similar",
          "reasoning": string
        }
      ],
      "pricing_factors": {
        "social_influence_score": number (0-100),
        "press_value_score": number (0-100),
        "demand_score": number (0-100),
        "competition_score": number (0-100),
        "verification_bonus": number (0-20),
        "engagement_quality_multiplier": number (0.5-2.0)
      },
      "reasoning": string,
      "price_range": {
        "min": number,
        "max": number
      }
    }
    `;

    console.log('Sending analysis to OpenAI...');

    // Call OpenAI for AI analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert pricing analyst for creator economy platforms. Provide accurate, data-driven pricing recommendations based on comprehensive market analysis.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const analysis = JSON.parse(openaiData.choices[0].message.content);

    console.log('AI Analysis completed:', analysis);

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from('creator_market_analysis')
      .upsert({
        creator_id,
        suggested_price_per_minute: analysis.suggested_price_per_minute,
        confidence_score: analysis.confidence_score,
        competitor_analysis: analysis.competitor_analysis,
        market_position: analysis.market_position,
        pricing_factors: analysis.pricing_factors,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'creator_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw new Error(`Failed to save analysis: ${saveError.message}`);
    }

    console.log('Market rate analysis completed and saved');

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        suggested_price_per_minute: analysis.suggested_price_per_minute,
        confidence_score: analysis.confidence_score,
        market_position: analysis.market_position,
        reasoning: analysis.reasoning
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-market-rate-analysis:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});