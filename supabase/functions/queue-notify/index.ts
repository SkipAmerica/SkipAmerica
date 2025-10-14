import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { NOTIFICATION_TEMPLATES } from '../_shared/notification-templates.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const { creatorId, fanId, position, eta } = await req.json()

    console.log('[queue-notify] Processing notification', { creatorId, fanId, position, eta })

    // Fetch user preferences
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', fanId)
      .single()

    // Position 1: Go-time notification
    if (position === 1) {
      console.log('[queue-notify] Sending P1 go-time', { fanId, creatorId })
      
      // Fetch phone from call_queue
      const { data: queueEntry } = await supabase
        .from('call_queue')
        .select('fan_phone_number')
        .eq('creator_id', creatorId)
        .eq('fan_id', fanId)
        .eq('status', 'waiting')
        .single()

      if (queueEntry?.fan_phone_number && twilioSid && twilioToken) {
        // Fetch creator name for personalization
        const { data: creator } = await supabase
          .from('creators')
          .select('full_name')
          .eq('id', creatorId)
          .single()

        const creatorName = creator?.full_name || 'The creator'
        const joinLink = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/join-queue/${creatorId}`
        
        const message = NOTIFICATION_TEMPLATES.QUEUE_P1_GO_TIME.sms
          .replace('{creatorName}', creatorName)
          .replace('{joinLink}', joinLink)
        
        await sendSMS(queueEntry.fan_phone_number, message)
        console.log('[queue-notify] SMS sent to', queueEntry.fan_phone_number)
      } else {
        console.log('[queue-notify] No phone or Twilio not configured')
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[queue-notify] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function sendSMS(to: string, body: string) {
  if (!twilioSid || !twilioToken || !twilioPhone) {
    console.warn('[queue-notify] Twilio not configured, skipping SMS')
    return
  }

  const auth = btoa(`${twilioSid}:${twilioToken}`)
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioPhone,
        To: to,
        Body: body,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Twilio SMS failed: ${await response.text()}`)
  }
}
