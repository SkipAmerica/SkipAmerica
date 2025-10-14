import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { HalfStarRating } from './HalfStarRating'
import { useRatingSubmission } from '@/hooks/useRatingSubmission'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'

interface PostCallRatingModalProps {
  open: boolean
  onClose: () => void
  sessionId: string
  creatorId: string
  creatorName: string
  creatorBio: string
  creatorAvatarUrl: string
}

export function PostCallRatingModal({
  open,
  onClose,
  sessionId,
  creatorId,
  creatorName,
  creatorBio,
  creatorAvatarUrl
}: PostCallRatingModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [tipSkips, setTipSkips] = useState<number | ''>('')
  const { submitAll, submitting } = useRatingSubmission()

  const usd = useMemo(() => {
    if (typeof tipSkips === 'number' && tipSkips > 0) {
      return (tipSkips / 100).toFixed(2)
    }
    return '0.00'
  }, [tipSkips])

  const canSubmit = rating > 0 || (typeof tipSkips === 'number' && tipSkips > 0)

  if (!open) return null

  const handleSubmit = async () => {
    const ratingData = rating > 0 ? {
      sessionId,
      ratedUserId: creatorId,
      rating,
      comment: comment.trim() || undefined
    } : undefined

    const tipData = typeof tipSkips === 'number' && tipSkips > 0 ? {
      sessionId,
      recipientId: creatorId,
      amountSkips: tipSkips
    } : undefined

    const success = await submitAll(ratingData, tipData)
    if (success) {
      onClose()
    }
  }

  const handleQuickTip = (amount: number) => {
    const current = typeof tipSkips === 'number' ? tipSkips : 0
    setTipSkips(current + amount)
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative max-w-md w-full bg-white rounded-2xl border-[3px] border-[hsl(var(--turquoise))] shadow-xl p-5 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={creatorAvatarUrl} alt={creatorName} />
            <AvatarFallback className="bg-muted">
              {creatorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">
              {creatorName || 'Creator'}
            </div>
            {creatorBio && (
              <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {creatorBio}
              </div>
            )}
          </div>
        </div>

        {/* Rating Section */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Rate your experience
          </label>
          <HalfStarRating
            value={rating}
            onChange={setRating}
            size="lg"
            className="justify-center"
          />
          {rating > 0 && (
            <div className="text-center text-sm text-muted-foreground mt-1">
              {rating} out of 5 stars
            </div>
          )}
        </div>

        {/* Comment Section */}
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Leave a note (optional)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this session..."
            className="resize-none focus-visible:ring-[hsl(var(--turquoise))]"
            rows={3}
          />
        </div>

        {/* Tip Section */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-foreground">
              Send a tip (optional)
            </label>
            <span className="text-xs text-muted-foreground">
              100 Skips = $1.00
            </span>
          </div>
          
          <div className="flex gap-2 mb-3">
            <Input
              type="number"
              min={0}
              value={tipSkips}
              onChange={(e) => {
                const val = e.target.value
                setTipSkips(val === '' ? '' : Math.max(0, Number(val)))
              }}
              placeholder="Enter Skips amount"
              className="flex-1 focus-visible:ring-[hsl(var(--turquoise))]"
            />
            <div className="flex items-center justify-center min-w-[80px] px-3 bg-muted rounded-md text-sm font-medium">
              ${usd}
            </div>
          </div>

          {/* Quick Tip Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickTip(amount)}
                className="text-xs"
              >
                +{amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 bg-[hsl(var(--turquoise))] hover:bg-[hsl(var(--turquoise))]/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
