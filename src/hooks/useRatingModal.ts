import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

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

const REQUIRED_KEYS: (keyof RatingModalParams)[] = [
  'sessionId','targetUserId','targetUserName','targetUserBio','targetUserAvatarUrl',
  'raterRole','showTipSection','showAppointmentLink','creatorHasAppointments'
]

export function useRatingModal() {
  const location = useLocation()
  const navigate = useNavigate()

  const parsed = useMemo<RatingModalParams | null>(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('sr') !== '1') return null

    const raw: Partial<RatingModalParams> = {
      sessionId: q.get('sid') || '',
      targetUserId: q.get('tuid') || '',
      targetUserName: decodeURIComponent(q.get('tuname') || ''),
      targetUserBio: decodeURIComponent(q.get('tubio') || ''),
      targetUserAvatarUrl: decodeURIComponent(q.get('tuavatar') || ''),
      raterRole: (q.get('raterRole') as 'creator' | 'user') || 'user',
      showTipSection: q.get('showTip') === '1',
      showAppointmentLink: q.get('showAppt') === '1',
      creatorHasAppointments: q.get('hasAppt') === '1',
    }

    // Validate presence of required keys
    for (const k of REQUIRED_KEYS) {
      if (raw[k] === undefined || raw[k] === null) return null
    }

    return raw as RatingModalParams
  }, [location.search])

  const close = useCallback(() => {
    const url = new URL(window.location.href)
    ;['sr','sid','tuid','tuname','tubio','tuavatar','raterRole','showTip','showAppt','hasAppt']
      .forEach((k) => url.searchParams.delete(k))
    navigate({ pathname: url.pathname, search: url.search }, { replace: true })
  }, [navigate])

  return { params: parsed, close }
}
