import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PostCallRatingModal } from './PostCallRatingModal'

export function RatingModalManager() {
  const location = useLocation()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    sessionId: string
    creatorId: string
    creatorName: string
    creatorBio: string
    creatorAvatarUrl: string
  } | null>(null)

  // Check for rating modal query params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const shouldShow = params.get('sc') === '1'

    if (shouldShow) {
      const sessionId = params.get('sid') || ''
      const creatorId = params.get('cid') || ''
      const creatorName = decodeURIComponent(params.get('cname') || '')
      const creatorBio = decodeURIComponent(params.get('cbio') || '')
      const creatorAvatarUrl = decodeURIComponent(params.get('cavatar') || '')

      if (sessionId && creatorId) {
        setModalData({
          sessionId,
          creatorId,
          creatorName,
          creatorBio,
          creatorAvatarUrl
        })
        setModalOpen(true)
      }
    }
  }, [location.search])

  const handleModalClose = () => {
    setModalOpen(false)
    setModalData(null)
    // Clean query params
    const url = new URL(window.location.href)
    url.searchParams.delete('sc')
    url.searchParams.delete('sid')
    url.searchParams.delete('cid')
    url.searchParams.delete('cname')
    url.searchParams.delete('cbio')
    url.searchParams.delete('cavatar')
    navigate({ pathname: url.pathname }, { replace: true })
  }

  if (!modalOpen || !modalData) return null

  return (
    <PostCallRatingModal
      open={modalOpen}
      onClose={handleModalClose}
      sessionId={modalData.sessionId}
      creatorId={modalData.creatorId}
      creatorName={modalData.creatorName}
      creatorBio={modalData.creatorBio}
      creatorAvatarUrl={modalData.creatorAvatarUrl}
    />
  )
}
