import { PostCallRatingModal } from './PostCallRatingModal'
import { CreatorRatesUserModal } from './CreatorRatesUserModal'
import { useRatingModal } from '@/hooks/useRatingModal'
import { ErrorBoundary } from '@/shared/ui/error-boundary'

function RatingModalManager() {
  const { params, close } = useRatingModal()

  if (!params) return null

  if (params.raterRole === 'creator') {
    return (
      <CreatorRatesUserModal
        open={true}
        onClose={close}
        sessionId={params.sessionId}
        userId={params.targetUserId}
        userName={params.targetUserName}
        userAvatarUrl={params.targetUserAvatarUrl}
      />
    )
  }

  return (
    <PostCallRatingModal
      open={true}
      onClose={close}
      sessionId={params.sessionId}
      creatorId={params.targetUserId}
      creatorName={params.targetUserName}
      creatorBio={params.targetUserBio}
      creatorAvatarUrl={params.targetUserAvatarUrl}
      showAppointmentLink={params.showAppointmentLink}
      creatorHasAppointments={params.creatorHasAppointments}
    />
  )
}

// Wrap with error boundary for defense-in-depth
export function RatingModalManagerWithBoundary() {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center text-muted-foreground">Rating modal error - please refresh</div>}>
      <RatingModalManager />
    </ErrorBoundary>
  )
}

// Export wrapped version as default
export { RatingModalManagerWithBoundary as RatingModalManager }
