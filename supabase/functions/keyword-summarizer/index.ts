import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { keywords } = await req.json();

    if (!keywords || keywords.length === 0) {
      return new Response(JSON.stringify({ summary: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (keywords.length === 1) {
      return new Response(JSON.stringify({ summary: `Searching for ${keywords[0]}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are a search query summarizer for a creator discovery platform. Convert keyword lists into natural, concise search descriptions. Focus on location, industry, expertise, and qualifications. Keep responses under 60 characters when possible.' 
          },
          { 
            role: 'user', 
            content: `Summarize these search keywords into a natural description: ${keywords.join(', ')}` 
          }
        ],
        max_completion_tokens: 50,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const summary = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in keyword-summarizer function:', error);
    
    // Fallback to simple keyword count
    const { keywords } = await req.json().catch(() => ({ keywords: [] }));
    const fallbackSummary = keywords.length > 1 
      ? `${keywords.length} keywords active`
      : keywords.length === 1 
        ? `Searching for ${keywords[0]}`
        : '';

    return new Response(JSON.stringify({ 
      summary: fallbackSummary,
      error: error.message 
    }), {
      status: 200, // Return 200 with fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});