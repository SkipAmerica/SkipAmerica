import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  content: string;
  type: 'text' | 'voice_transcript';
  context?: {
    userId: string;
    callId: string;
    timestamp: number;
  };
}

interface ModerationResponse {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  action: 'allow' | 'block' | 'warn' | 'pause';
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { content, type, context }: ModerationRequest = await req.json();

    if (!content || !type) {
      throw new Error('Content and type are required');
    }

    // Call OpenAI Moderation API
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: 'text-moderation-stable',
      }),
    });

    if (!moderationResponse.ok) {
      const error = await moderationResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    // Determine action based on moderation results
    let action: 'allow' | 'block' | 'warn' | 'pause' = 'allow';
    let reason = '';

    if (result.flagged) {
      // Check for severe violations that require immediate blocking
      const severeCategories = ['sexual/minors', 'violence/graphic', 'harassment/threatening'];
      const hasSevereViolation = severeCategories.some(cat => 
        result.categories[cat] || result.category_scores[cat] > 0.8
      );

      if (hasSevereViolation) {
        action = 'pause';
        reason = 'Call paused due to severe policy violation';
      } else {
        // Less severe violations get a warning
        action = 'warn';
        reason = 'Content may violate community guidelines';
      }
    }

    // Enhanced filtering for voice content
    if (type === 'voice_transcript') {
      // Additional checks for voice-specific content
      const voicePatterns = [
        /\b(private|personal)\s+(info|information|details)\b/i,
        /\b(meet|meeting)\s+(offline|in\s+person)\b/i,
        /\b(phone\s+number|address|location)\b/i,
      ];

      const hasVoiceViolation = voicePatterns.some(pattern => pattern.test(content));
      if (hasVoiceViolation && action === 'allow') {
        action = 'warn';
        reason = 'Potential sharing of personal information in voice';
      }
    }

    const response: ModerationResponse = {
      flagged: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
      action,
      reason: reason || undefined,
    };

    // Log moderation events for monitoring
    console.log('Moderation result:', {
      type,
      action,
      flagged: result.flagged,
      userId: context?.userId,
      callId: context?.callId,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Moderation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        flagged: false,
        action: 'allow' // Fail open for better UX
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});