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
    
    const { creator_id, creator_name } = await req.json();
    
    if (!creator_id || !creator_name) {
      throw new Error('Creator ID and name are required');
    }

    console.log(`Analyzing press coverage for creator: ${creator_name}`);

    // In a real implementation, this would scrape news sites, Google News, etc.
    // For demo purposes, we'll simulate finding press coverage
    const mockPressArticles = await simulatePressSearch(creator_name);

    const analysisResults = [];

    for (const article of mockPressArticles) {
      // Analyze each article with AI
      const analysisPrompt = `
      Analyze this press coverage for pricing/valuation purposes:

      Article Title: ${article.title}
      Publication: ${article.publication}
      Content Preview: ${article.content}
      Published: ${article.published_date}

      Assess this coverage for:
      1. Sentiment (positive/negative/neutral)
      2. Relevance to creator's market value
      3. Impact on public perception
      4. Credibility of the publication

      Respond in JSON format:
      {
        "sentiment_score": number (-1 to 1, where -1 is very negative, 1 is very positive),
        "relevance_score": number (0-100),
        "impact_score": number (0-100),
        "credibility_score": number (0-100),
        "key_mentions": [string],
        "value_drivers": [string],
        "concerns": [string]
      }
      `;

      try {
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
                content: 'You are a media analyst specializing in press coverage impact on creator economy valuation.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            temperature: 0.2,
            max_tokens: 1000
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const analysis = JSON.parse(openaiData.choices[0].message.content);
          
          // Save to database
          const { error: saveError } = await supabaseAdmin
            .from('creator_press_coverage')
            .upsert({
              creator_id,
              article_url: article.url,
              publication: article.publication,
              title: article.title,
              published_date: article.published_date,
              sentiment_score: analysis.sentiment_score,
              relevance_score: analysis.relevance_score,
              impact_score: analysis.impact_score,
              article_content: article.content,
              mentions_count: 1
            }, {
              onConflict: 'creator_id,article_url'
            });

          if (!saveError) {
            analysisResults.push({
              ...article,
              ...analysis
            });
          }
        }
      } catch (error) {
        console.error('Error analyzing article:', error);
        // Continue with other articles even if one fails
      }
    }

    // Calculate overall press impact score
    const overallImpact = calculateOverallPressImpact(analysisResults);

    console.log('Press coverage analysis completed');

    return new Response(JSON.stringify({
      success: true,
      articles_analyzed: analysisResults.length,
      overall_impact: overallImpact,
      recent_coverage: analysisResults.slice(0, 5) // Return top 5 for response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in press-coverage-analyzer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Simulate press search results
async function simulatePressSearch(creatorName: string) {
  // This would be replaced with real web scraping/API calls
  const mockArticles = [
    {
      url: `https://techcrunch.com/creator-spotlight-${creatorName.toLowerCase().replace(' ', '-')}`,
      publication: 'TechCrunch',
      title: `${creatorName} Disrupts Creator Economy with Innovative Approach`,
      content: `${creatorName} has been making waves in the creator economy, building a substantial following through authentic content and direct fan engagement. Industry experts predict significant growth potential.`,
      published_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
    },
    {
      url: `https://variety.com/digital-influencer-${creatorName.toLowerCase().replace(' ', '-')}-profile`,
      publication: 'Variety',
      title: `Rising Digital Star: ${creatorName}'s Journey to Success`,
      content: `From humble beginnings to digital stardom, ${creatorName} represents the new generation of content creators who are redefining entertainment and fan interaction.`,
      published_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      url: `https://forbes.com/creator-economy-leaders-${creatorName.toLowerCase().replace(' ', '-')}`,
      publication: 'Forbes',
      title: `${creatorName} Among Top Creator Economy Innovators`,
      content: `${creatorName}'s unique approach to monetization and fan engagement places them among the most promising creators in the digital economy space.`,
      published_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Filter to 1-3 random articles to simulate realistic search results
  const numArticles = Math.floor(Math.random() * 3) + 1;
  return mockArticles.slice(0, numArticles);
}

function calculateOverallPressImpact(articles: any[]) {
  if (articles.length === 0) {
    return {
      score: 0,
      tier: 'no-coverage',
      summary: 'No significant press coverage found'
    };
  }

  const avgSentiment = articles.reduce((sum, a) => sum + a.sentiment_score, 0) / articles.length;
  const avgImpact = articles.reduce((sum, a) => sum + a.impact_score, 0) / articles.length;
  const avgRelevance = articles.reduce((sum, a) => sum + a.relevance_score, 0) / articles.length;
  
  const overallScore = (avgSentiment + 1) / 2 * 0.4 + avgImpact / 100 * 0.4 + avgRelevance / 100 * 0.2;
  
  let tier = 'low-coverage';
  if (overallScore > 0.7 && articles.length >= 3) tier = 'high-coverage';
  else if (overallScore > 0.5) tier = 'moderate-coverage';

  return {
    score: Math.round(overallScore * 100),
    tier,
    articles_count: articles.length,
    avg_sentiment: avgSentiment,
    summary: `Found ${articles.length} relevant articles with ${tier.replace('-', ' ')}`
  };
}