import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  audioData: string; // base64 encoded audio
  format: 'webm' | 'mp3' | 'wav';
  userId: string;
  callId: string;
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

    const { audioData, format, userId, callId }: TranscriptionRequest = await req.json();

    if (!audioData || !format) {
      throw new Error('Audio data and format are required');
    }

    // Convert base64 to blob
    const audioBytes = new Uint8Array(
      atob(audioData).split('').map(char => char.charCodeAt(0))
    );
    
    // Create FormData for OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([audioBytes], { type: `audio/${format}` });
    formData.append('file', audioBlob, `audio.${format}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');
    
    // Optional: Add prompt for better context
    formData.append('prompt', 'This is a video call conversation between a content creator and fans.');

    // Call OpenAI Whisper API
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.json();
      throw new Error(`Whisper API error: ${error.error?.message || 'Unknown error'}`);
    }

    const transcriptionData = await transcriptionResponse.json();

    // If transcription is empty or too short, skip moderation
    if (!transcriptionData.text || transcriptionData.text.trim().length < 3) {
      return new Response(JSON.stringify({
        transcript: '',
        moderation: { flagged: false, action: 'allow' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Now moderate the transcribed text
    const moderationResponse = await fetch(`${req.url.replace('/voice-transcription', '/ai-moderation')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: transcriptionData.text,
        type: 'voice_transcript',
        context: {
          userId,
          callId,
          timestamp: Date.now(),
        }
      }),
    });

    let moderationResult = { flagged: false, action: 'allow' };
    if (moderationResponse.ok) {
      moderationResult = await moderationResponse.json();
    } else {
      console.warn('Moderation failed, allowing content');
    }

    // Log transcription for monitoring
    console.log('Voice transcription:', {
      userId,
      callId,
      transcript: transcriptionData.text,
      moderation: moderationResult,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      transcript: transcriptionData.text,
      moderation: moderationResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Voice transcription error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        transcript: '',
        moderation: { flagged: false, action: 'allow' }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});