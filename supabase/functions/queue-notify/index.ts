import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Check quiet hours
    if (prefs && isQuietHours(prefs)) {
      return new Response(JSON.stringify({ skipped: 'quiet_hours' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Position 2: Heads-up notification
    if (position === 2) {
      console.log('[queue-notify] Sending P2 heads-up', { fanId })
      
      // Send SMS if enabled and Twilio configured
      if (prefs?.enable_sms && prefs?.phone_verified && twilioSid && twilioToken) {
        const message = `You're almost up in the queue! ETA ~${eta} min. Reply READY when you're set, or SNOOZE to step back.`
        await sendSMS(prefs.phone_number!, message)
      }
    }

    // Position 1: Go-time notification
    if (position === 1) {
      console.log('[queue-notify] Sending P1 go-time', { fanId })
      
      const joinLink = `${supabaseUrl.replace('://supabase', '://your-app')}/session/${creatorId}?role=user`
      
      if (prefs?.enable_sms && prefs?.phone_verified && twilioSid && twilioToken) {
        const message = `🔴 Creator is ready for you! Join: ${joinLink}\nReply HOLD to wait 60s, PASS to skip.`
        await sendSMS(prefs.phone_number!, message)
        
        // Schedule reminder in 60s (would need proper job queue in production)
        // setTimeout(() => sendReminder(prefs.phone_number!, joinLink), 60000)
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

function isQuietHours(prefs: any): boolean {
  // Implement timezone-aware quiet hours check
  // For now, just return false
  return false
}
