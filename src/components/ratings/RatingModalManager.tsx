import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PostCallRatingModal } from './PostCallRatingModal'
import { CreatorRatesUserModal } from './CreatorRatesUserModal'

export function RatingModalManager() {
  const location = useLocation()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [modalData, setModalData] = useState<{
    sessionId: string
    targetUserId: string
    targetUserName: string
    targetUserBio?: string
    targetUserAvatarUrl: string
    raterRole: 'creator' | 'user'
    showTipSection?: boolean
    showAppointmentLink?: boolean
    creatorHasAppointments?: boolean
  } | null>(null)

  // Wait for initial page render to stabilize
  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!pageReady) return
    
    const params = new URLSearchParams(location.search)
    const shouldShow = params.get('sr') === '1'

    if (shouldShow) {
      const sessionId = params.get('sid') || ''
      const targetUserId = params.get('tuid') || ''
      const targetUserName = decodeURIComponent(params.get('tuname') || '')
      const targetUserBio = decodeURIComponent(params.get('tubio') || '')
      const targetUserAvatarUrl = decodeURIComponent(params.get('tuavatar') || '')
      const raterRole = (params.get('raterRole') as 'creator' | 'user') || 'user'
      const showTipSection = params.get('showTip') === '1'
      const showAppointmentLink = params.get('showAppt') === '1'
      const creatorHasAppointments = params.get('hasAppt') === '1'

      // Immediately clean URL before setting state
      const cleanUrl = new URL(window.location.href)
      ;['sr', 'sid', 'tuid', 'tuname', 'tubio', 'tuavatar', 'raterRole', 'showTip', 'showAppt', 'hasAppt'].forEach(k =>
        cleanUrl.searchParams.delete(k)
      )
      window.history.replaceState({}, '', cleanUrl.pathname)

      if (sessionId && targetUserId) {
        setModalData({
          sessionId,
          targetUserId,
          targetUserName,
          targetUserBio,
          targetUserAvatarUrl,
          raterRole,
          showTipSection,
          showAppointmentLink,
          creatorHasAppointments
        })
        setModalOpen(true)
      }
    }
  }, [location.search, pageReady])

  const handleModalClose = () => {
    setModalOpen(false)
    setModalData(null)
    const url = new URL(window.location.href)
    ;['sr', 'sid', 'tuid', 'tuname', 'tubio', 'tuavatar', 'raterRole', 'showTip', 'showAppt', 'hasAppt'].forEach(k =>
      url.searchParams.delete(k)
    )
    navigate({ pathname: url.pathname }, { replace: true })
  }

  if (!modalOpen || !modalData) return null

  if (modalData.raterRole === 'creator') {
    return (
      <CreatorRatesUserModal
        open={modalOpen}
        onClose={handleModalClose}
        sessionId={modalData.sessionId}
        userId={modalData.targetUserId}
        userName={modalData.targetUserName}
        userAvatarUrl={modalData.targetUserAvatarUrl}
      />
    )
  }

  return (
    <PostCallRatingModal
      open={modalOpen}
      onClose={handleModalClose}
      sessionId={modalData.sessionId}
      creatorId={modalData.targetUserId}
      creatorName={modalData.targetUserName}
      creatorBio={modalData.targetUserBio || ''}
      creatorAvatarUrl={modalData.targetUserAvatarUrl}
      showAppointmentLink={modalData.showAppointmentLink}
      creatorHasAppointments={modalData.creatorHasAppointments}
    />
  )
}
