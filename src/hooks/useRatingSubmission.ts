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

    // Check sender balance
    const { data: balanceData } = await (supabase as any)
      .from('user_balances')
      .select('balance_skips')
      .eq('user_id', user.id)
      .maybeSingle()

    const currentBalance = balanceData?.balance_skips || 0
    if (currentBalance < data.amountSkips) {
      throw new Error(`Insufficient Skips balance. You have ${currentBalance} Skips.`)
    }

    // Insert tip
    const { error: tipError } = await (supabase as any)
      .from('tips')
      .insert({
        session_id: data.sessionId,
        sender_id: user.id,
        recipient_id: data.recipientId,
        amount_skips: data.amountSkips
      })

    if (tipError) throw tipError

    // Update sender balance
    await (supabase as any)
      .from('user_balances')
      .update({ balance_skips: currentBalance - data.amountSkips })
      .eq('user_id', user.id)

    // Update recipient balance
    const { data: recipientBalance } = await (supabase as any)
      .from('user_balances')
      .select('balance_skips')
      .eq('user_id', data.recipientId)
      .maybeSingle()

    const newRecipientBalance = (recipientBalance?.balance_skips || 0) + data.amountSkips

    await (supabase as any)
      .from('user_balances')
      .update({ balance_skips: newRecipientBalance })
      .eq('user_id', data.recipientId)
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
