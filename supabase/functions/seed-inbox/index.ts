import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { creatorId } = await req.json();

    if (!creatorId) {
      return new Response(
        JSON.stringify({ error: 'creatorId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Starting inbox seeding for creator:', creatorId);

    // Generate deterministic UUIDs for test fans
    const fan1Id = crypto.randomUUID();
    const fan2Id = crypto.randomUUID();

    // Create fan profiles
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .upsert([
        {
          id: fan1Id,
          full_name: 'Test Fan Alpha',
          account_type: 'fan',
        },
        {
          id: fan2Id,
          full_name: 'Test Fan Beta',
          account_type: 'fan',
        },
      ]);

    if (profilesError) {
      console.error('Error creating profiles:', profilesError);
      throw profilesError;
    }

    // Create a pending offer
    const { data: offerData, error: offerError } = await supabaseAdmin
      .from('offers')
      .insert({
        creator_id: creatorId,
        user_id: fan1Id,
        amount_cents: 15000,
        duration_minutes: 30,
        currency: 'USD',
        status: 'pending',
        note: 'Would love to discuss your latest project!',
      })
      .select()
      .single();

    if (offerError) {
      console.error('Error creating offer:', offerError);
      throw offerError;
    }

    // Create threads
    const threads = [
      {
        creator_id: creatorId,
        user_id: fan1Id,
        type: 'priority',
        offer_id: offerData.id,
        last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        last_message_preview: 'Would love to discuss your latest project!',
        unread_count_creator: 1,
      },
      {
        creator_id: creatorId,
        user_id: fan2Id,
        type: 'standard',
        last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        last_message_preview: 'Hey! Big fan of your work.',
        unread_count_creator: 2,
      },
      {
        creator_id: creatorId,
        user_id: fan1Id,
        type: 'request',
        last_message_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        last_message_preview: 'Can you help me with something?',
        unread_count_creator: 1,
      },
    ];

    const { data: threadsData, error: threadsError } = await supabaseAdmin
      .from('threads')
      .insert(threads)
      .select();

    if (threadsError) {
      console.error('Error creating threads:', threadsError);
      throw threadsError;
    }

    // Create messages for each thread
    const messages = [
      {
        thread_id: threadsData[0].id,
        sender_id: fan1Id,
        receiver_id: creatorId,
        content: 'Would love to discuss your latest project!',
        mtype: 'text',
        read_by_creator: false,
        read_by_user: true,
      },
      {
        thread_id: threadsData[1].id,
        sender_id: fan2Id,
        receiver_id: creatorId,
        content: 'Hey! Big fan of your work.',
        mtype: 'text',
        read_by_creator: false,
        read_by_user: true,
      },
      {
        thread_id: threadsData[1].id,
        sender_id: fan2Id,
        receiver_id: creatorId,
        content: 'Would love to connect sometime!',
        mtype: 'text',
        read_by_creator: false,
        read_by_user: true,
      },
      {
        thread_id: threadsData[2].id,
        sender_id: fan1Id,
        receiver_id: creatorId,
        content: 'Can you help me with something?',
        mtype: 'text',
        read_by_creator: false,
        read_by_user: true,
      },
    ];

    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .insert(messages);

    if (messagesError) {
      console.error('Error creating messages:', messagesError);
      throw messagesError;
    }

    console.log('Inbox seeding completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inbox seeded successfully',
        data: {
          profiles_created: 2,
          offers_created: 1,
          threads_created: threadsData.length,
          messages_created: messages.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seed-inbox function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to seed inbox',
        details: error 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
