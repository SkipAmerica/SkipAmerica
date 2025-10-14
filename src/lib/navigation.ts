export type RatingModalParams = {
  sessionId: string
  targetUserId: string
  targetUserName: string
  targetUserBio: string
  targetUserAvatarUrl: string
  raterRole: 'creator' | 'user'
  showTipSection: boolean
  showAppointmentLink: boolean
  creatorHasAppointments: boolean
}

export function buildRatingSearch(params: RatingModalParams): string {
  const q = new URLSearchParams()
  q.set('sr', '1')
  q.set('sid', params.sessionId)
  q.set('tuid', params.targetUserId)
  q.set('tuname', encodeURIComponent(params.targetUserName))
  q.set('tubio', encodeURIComponent(params.targetUserBio))
  q.set('tuavatar', encodeURIComponent(params.targetUserAvatarUrl))
  q.set('raterRole', params.raterRole)
  q.set('showTip', params.showTipSection ? '1' : '0')
  q.set('showAppt', params.showAppointmentLink ? '1' : '0')
  q.set('hasAppt', params.creatorHasAppointments ? '1' : '0')
  return `?${q.toString()}`
}

export function navigateToRatingModal(
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  basePath: string,
  params: RatingModalParams
) {
  navigate(`${basePath}${buildRatingSearch(params)}`, { replace: true })
}
