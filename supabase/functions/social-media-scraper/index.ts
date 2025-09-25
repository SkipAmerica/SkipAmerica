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
    
    const { creator_id, platform, username } = await req.json();
    
    if (!creator_id || !platform || !username) {
      throw new Error('Creator ID, platform, and username are required');
    }

    console.log(`Analyzing ${platform} profile for creator ${creator_id}: @${username}`);

    // Simulate social media analysis (in production, this would use real APIs)
    // For demo purposes, we'll generate realistic data based on platform and username
    
    let socialMetrics;
    
    if (platform === 'youtube') {
      // Simulate YouTube API data
      socialMetrics = await simulateYouTubeAnalysis(username);
    } else if (platform === 'twitter') {
      // Simulate Twitter API data
      socialMetrics = await simulateTwitterAnalysis(username);
    } else if (platform === 'instagram') {
      // Simulate Instagram analysis
      socialMetrics = await simulateInstagramAnalysis(username);
    } else {
      throw new Error(`Platform ${platform} not supported`);
    }

    // Use AI to analyze the social media presence quality
    const qualityAnalysisPrompt = `
    Analyze this social media profile quality for pricing purposes:

    Platform: ${platform}
    Username: @${username}
    Metrics: ${JSON.stringify(socialMetrics, null, 2)}

    Provide a quality assessment focusing on:
    1. Engagement quality vs quantity
    2. Audience authenticity
    3. Content consistency and professionalism
    4. Influence potential for premium pricing

    Respond in JSON format:
    {
      "audience_quality_score": number (0-100),
      "influence_score": number (0-100),
      "engagement_rate": number,
      "pricing_tier_suggestion": "budget" | "mid-tier" | "premium",
      "key_factors": [string],
      "concerns": [string]
    }
    `;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a social media analyst specializing in creator economy valuation and pricing strategy.'
          },
          {
            role: 'user',
            content: qualityAnalysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const qualityAnalysis = JSON.parse(openaiData.choices[0].message.content);

    // Combine metrics with AI analysis
    const finalAnalysis = {
      ...socialMetrics,
      ...qualityAnalysis,
      last_analyzed: new Date().toISOString()
    };

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from('creator_social_analysis')
      .upsert({
        creator_id,
        platform,
        follower_count: socialMetrics.follower_count,
        engagement_rate: qualityAnalysis.engagement_rate,
        avg_likes_per_post: socialMetrics.avg_likes_per_post,
        avg_comments_per_post: socialMetrics.avg_comments_per_post,
        posting_frequency: socialMetrics.posting_frequency,
        audience_quality_score: qualityAnalysis.audience_quality_score,
        influence_score: qualityAnalysis.influence_score,
        verified_status: socialMetrics.verified_status,
        account_age_months: socialMetrics.account_age_months,
        last_analyzed: new Date().toISOString()
      }, {
        onConflict: 'creator_id,platform'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving social analysis:', saveError);
      throw new Error(`Failed to save social analysis: ${saveError.message}`);
    }

    console.log('Social media analysis completed and saved');

    return new Response(JSON.stringify({
      success: true,
      analysis: finalAnalysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in social-media-scraper:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Simulation functions for demo purposes
async function simulateYouTubeAnalysis(username: string) {
  // Generate realistic YouTube metrics based on username
  const baseFollowers = Math.floor(Math.random() * 1000000) + 10000;
  const engagementRate = Math.random() * 8 + 2; // 2-10%
  
  return {
    follower_count: baseFollowers,
    avg_likes_per_post: Math.floor(baseFollowers * (engagementRate / 100) * 0.8),
    avg_comments_per_post: Math.floor(baseFollowers * (engagementRate / 100) * 0.1),
    posting_frequency: Math.floor(Math.random() * 7) + 1, // 1-7 videos per week
    verified_status: baseFollowers > 100000 && Math.random() > 0.3,
    account_age_months: Math.floor(Math.random() * 120) + 12, // 1-10 years
    view_count_per_video: Math.floor(baseFollowers * 0.3),
    subscriber_growth_rate: Math.random() * 10 - 5 // -5% to +5% monthly
  };
}

async function simulateTwitterAnalysis(username: string) {
  const baseFollowers = Math.floor(Math.random() * 500000) + 5000;
  const engagementRate = Math.random() * 5 + 1; // 1-6%
  
  return {
    follower_count: baseFollowers,
    avg_likes_per_post: Math.floor(baseFollowers * (engagementRate / 100) * 0.6),
    avg_comments_per_post: Math.floor(baseFollowers * (engagementRate / 100) * 0.2),
    posting_frequency: Math.floor(Math.random() * 20) + 5, // 5-25 tweets per week
    verified_status: baseFollowers > 50000 && Math.random() > 0.4,
    account_age_months: Math.floor(Math.random() * 180) + 6, // 6 months to 15 years
    retweet_rate: Math.random() * 3,
    mention_frequency: Math.floor(Math.random() * 100) + 10
  };
}

async function simulateInstagramAnalysis(username: string) {
  const baseFollowers = Math.floor(Math.random() * 2000000) + 1000;
  const engagementRate = Math.random() * 6 + 2; // 2-8%
  
  return {
    follower_count: baseFollowers,
    avg_likes_per_post: Math.floor(baseFollowers * (engagementRate / 100)),
    avg_comments_per_post: Math.floor(baseFollowers * (engagementRate / 100) * 0.05),
    posting_frequency: Math.floor(Math.random() * 10) + 3, // 3-12 posts per week
    verified_status: baseFollowers > 75000 && Math.random() > 0.35,
    account_age_months: Math.floor(Math.random() * 100) + 12, // 1-8 years
    story_views_per_day: Math.floor(baseFollowers * 0.4),
    reel_performance: Math.random() * 2 + 0.5 // multiplier for reel engagement
  };
}