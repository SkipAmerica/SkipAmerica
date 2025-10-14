import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)
    const from = params.get('From')
    const message = params.get('Body')?.trim().toUpperCase()

    console.log('[sms-webhook] Received message', { from, message })

    // Lookup user by phone
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('phone_number', from)
      .single()

    if (!prefs) {
      return new Response(
        '<Response><Message>Phone not recognized. Please link your number in app settings.</Message></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Handle keywords
    if (message === 'READY') {
      await supabase
        .from('call_queue')
        .update({ fan_state: 'ready', fan_has_consented: true })
        .eq('fan_id', prefs.user_id)
      
      return new Response(
        '<Response><Message>Great! Marking you as ready.</Message></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (message === 'SNOOZE') {
      return new Response(
        '<Response><Message>Moved you back one spot. Reply READY when you\'re set.</Message></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (message === 'HOLD') {
      return new Response(
        '<Response><Message>Holding your spot for 60 seconds.</Message></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (message === 'PASS') {
      await supabase
        .from('call_queue')
        .delete()
        .eq('fan_id', prefs.user_id)
      
      return new Response(
        '<Response><Message>You\'ve been removed from the queue. Join again anytime!</Message></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    return new Response(
      '<Response><Message>Unknown command. Reply READY, SNOOZE, HOLD, or PASS.</Message></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('[sms-webhook] Error:', error)
    return new Response(
      '<Response><Message>Error processing your request. Please try again.</Message></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
})
