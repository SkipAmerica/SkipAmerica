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

  console.log('[RatingModalManager:RENDER]', {
    pathname: location.pathname,
    search: location.search,
    modalOpen,
    pageReady,
    hasModalData: !!modalData,
    timestamp: performance.now()
  })

  // Wait for initial page render to stabilize
  useEffect(() => {
    console.log('[RatingModalManager:INIT] Setting up page ready timer')
    const timer = setTimeout(() => {
      console.log('[RatingModalManager:INIT] Page ready timer fired')
      setPageReady(true)
    }, 100)
    return () => {
      console.log('[RatingModalManager:INIT] Cleanup page ready timer')
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    console.log('[RatingModalManager:PARAMS] Effect triggered', {
      pageReady,
      search: location.search,
      timestamp: performance.now()
    })
    
    if (!pageReady) {
      console.log('[RatingModalManager:PARAMS] Page not ready, skipping')
      return
    }
    
    const params = new URLSearchParams(location.search)
    const shouldShow = params.get('sr') === '1'

    console.log('[RatingModalManager:PARAMS] Parsed params', {
      shouldShow,
      allParams: Object.fromEntries(params.entries()),
      timestamp: performance.now()
    })

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

      console.log('[RatingModalManager:PARAMS] Extracted rating data', {
        sessionId,
        targetUserId,
        raterRole,
        timestamp: performance.now()
      })

      // Immediately clean URL before setting state
      console.log('[RatingModalManager:PARAMS] Cleaning URL params')
      const cleanUrl = new URL(window.location.href)
      ;['sr', 'sid', 'tuid', 'tuname', 'tubio', 'tuavatar', 'raterRole', 'showTip', 'showAppt', 'hasAppt'].forEach(k =>
        cleanUrl.searchParams.delete(k)
      )
      window.history.replaceState({}, '', cleanUrl.pathname)
      console.log('[RatingModalManager:PARAMS] URL cleaned', { newUrl: cleanUrl.pathname })

      if (sessionId && targetUserId) {
        console.log('[RatingModalManager:PARAMS] Setting modal state and opening')
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
      } else {
        console.warn('[RatingModalManager:PARAMS] Missing sessionId or targetUserId, skipping modal')
      }
    } else {
      console.log('[RatingModalManager:PARAMS] No rating modal requested (sr != 1)')
    }
  }, [location.search, pageReady])

  const handleModalClose = () => {
    console.log('[RatingModalManager:CLOSE] Modal closing', { timestamp: performance.now() })
    setModalOpen(false)
    setModalData(null)
    const url = new URL(window.location.href)
    ;['sr', 'sid', 'tuid', 'tuname', 'tubio', 'tuavatar', 'raterRole', 'showTip', 'showAppt', 'hasAppt'].forEach(k =>
      url.searchParams.delete(k)
    )
    console.log('[RatingModalManager:CLOSE] Navigating after close', { pathname: url.pathname })
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
