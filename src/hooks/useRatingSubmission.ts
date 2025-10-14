import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useLive } from '@/hooks/live'

interface RatingData {
  sessionId: string
  ratedUserId: string
  rating: number
  comment?: string
  tags?: string[]
}

interface TipData {
  sessionId: string
  recipientId: string
  amountSkips: number
}

export function useRatingSubmission() {
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { incrementCall } = useLive()

  const submitRating = async (data: RatingData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Use raw SQL to bypass type checking until types regenerate
    const { error } = await (supabase as any)
      .from('session_ratings')
      .insert({
        session_id: data.sessionId,
        rater_id: user.id,
        rated_user_id: data.ratedUserId,
        rating: data.rating,
        comment: data.comment || null,
        tags: data.tags || null
      })

    if (error) throw error
  }

  const submitTip = async (data: TipData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const idempotencyKey = crypto.randomUUID()

    const { data: result, error } = await (supabase as any).rpc('transfer_skips_atomic', {
      p_sender_id: user.id,
      p_recipient_id: data.recipientId,
      p_amount_skips: data.amountSkips,
      p_session_id: data.sessionId,
      p_idempotency_key: idempotencyKey
    })

    if (error) throw error
    if (!result || !result[0]?.tip_id) {
      throw new Error('Failed to process tip')
    }

    return result[0]
  }

  const submitAll = async (ratingData?: RatingData, tipData?: TipData) => {
    setSubmitting(true)
    try {
      if (ratingData) await submitRating(ratingData)
      if (tipData) await submitTip(tipData)

      // Increment LSB sessions completed counter
      incrementCall(0)

      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted.'
      })

      return true
    } catch (error) {
      console.error('[RatingSubmission]', error)
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return { submitAll, submitting }
}
