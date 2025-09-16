import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { creator_id, duration_minutes } = await req.json();

    if (!creator_id || !duration_minutes) {
      throw new Error("Creator ID and duration are required");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    // Get creator pricing for the specified duration
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('creator_call_pricing')
      .select('*')
      .eq('creator_id', creator_id)
      .eq('duration_minutes', duration_minutes)
      .eq('is_active', true)
      .single();

    if (pricingError || !pricingData) {
      throw new Error("Pricing not found for this creator and duration");
    }

    // Get creator profile for product name
    const { data: creatorProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', creator_id)
      .single();

    if (profileError || !creatorProfile) {
      throw new Error("Creator profile not found");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: userData.user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userData.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${duration_minutes}-Minute Call with ${creatorProfile.full_name}`,
              description: `Video call session with ${creatorProfile.full_name}`,
              metadata: {
                creator_id: creator_id,
                duration_minutes: duration_minutes.toString(),
                fan_id: userData.user.id
              }
            },
            unit_amount: Math.round(pricingData.price_per_block * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/call-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        creator_id: creator_id,
        duration_minutes: duration_minutes.toString(),
        fan_id: userData.user.id,
        call_type: 'time_block_purchase'
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});