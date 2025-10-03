import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ available: false, reason: 'invalid_format', message: 'Username is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Format validation
    const usernameRegex = /^(?!_)[a-zA-Z0-9_]{3,30}(?<!_)$/;
    const hasConsecutiveUnderscores = /__/.test(username);

    if (!usernameRegex.test(username) || hasConsecutiveUnderscores) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: 'invalid_format',
          message: '3-30 characters, letters, numbers, and underscores only. Cannot start/end with underscore or have consecutive underscores.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lowerUsername = username.toLowerCase();

    // Check against reserved usernames (celebrity/influencer protection)
    const { data: reservedData } = await supabase
      .from('reserved_usernames')
      .select('display_name, reason, verification_required')
      .eq('username', lowerUsername)
      .maybeSingle();

    if (reservedData) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: 'reserved',
          message: `This name is reserved (${reservedData.reason}). ${reservedData.verification_required ? 'Verification required.' : ''}`,
          requiresVerification: reservedData.verification_required,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check against existing profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', lowerUsername)
      .maybeSingle();

    if (profileData) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: 'taken',
          message: 'This username is already taken',
          suggestion: generateSuggestion(username),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check against existing creators
    const { data: creatorData } = await supabase
      .from('creators')
      .select('id')
      .ilike('username', lowerUsername)
      .maybeSingle();

    if (creatorData) {
      return new Response(
        JSON.stringify({
          available: false,
          reason: 'taken',
          message: 'This username is already taken',
          suggestion: generateSuggestion(username),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Username is available!
    return new Response(
      JSON.stringify({
        available: true,
        message: 'Username is available',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error checking username availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', available: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateSuggestion(username: string): string {
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${username}${randomNum}`;
}
