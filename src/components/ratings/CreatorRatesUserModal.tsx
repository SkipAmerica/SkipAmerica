import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { HalfStarRating } from './HalfStarRating'
import { useRatingSubmission } from '@/hooks/useRatingSubmission'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'

interface CreatorRatesUserModalProps {
  open: boolean
  onClose: () => void
  sessionId: string
  userId: string
  userName: string
  userAvatarUrl: string
}

const CREATOR_TAGS = [
  "Professional", "Respectful", "Engaged", "Good Audio",
  "On Time", "Prepared", "Clear Communication", "Valuable Questions"
]

export function CreatorRatesUserModal({
  open, onClose, sessionId, userId, userName, userAvatarUrl
}: CreatorRatesUserModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { submitAll, submitting } = useRatingSubmission()

  if (!open) return null

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    const ratingData = rating > 0 ? {
      sessionId,
      ratedUserId: userId,
      rating,
      comment: comment.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    } : undefined

    const success = await submitAll(ratingData, undefined)
    if (success) onClose()
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative max-w-md w-full bg-background rounded-2xl border-[3px] border-primary shadow-xl p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={userAvatarUrl} />
            <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-foreground">{userName}</div>
            <div className="text-sm text-muted-foreground">User</div>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block text-foreground">
            Rate your experience
          </label>
          <HalfStarRating value={rating} onChange={setRating} size="lg" className="justify-center" />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block text-foreground">
            Quick Tags (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {CREATOR_TAGS.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this user..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}
