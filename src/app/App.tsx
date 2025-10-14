// Main app component using new architecture
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { LiveControlBar } from '@/components/live/LiveControlBar'
import PreCallLobby from '@/components/live/PreCallLobby'
import { PostCallRatingModal } from '@/components/ratings/PostCallRatingModal'
import { useLive } from '@/hooks/live'
import { useSessionInvites } from '@/hooks/useSessionInvites'

function App() {
  React.useEffect(() => {
    const initializeCapacitor = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        
        if (Capacitor.getPlatform() === 'ios') {
          const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
          const { StatusBar, Style } = await import('@capacitor/status-bar')
          
          await Keyboard.setAccessoryBarVisible({ isVisible: false })
          await Keyboard.setResizeMode({ mode: KeyboardResize.None })
          await Keyboard.setScroll({ isDisabled: true })
          
          // Configure iOS status bar - white background with black text
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setBackgroundColor({ color: "#FFFFFF" })
          await StatusBar.setStyle({ style: Style.Light }) // Light style = dark/black text on light background
        }
      } catch (error) {
        console.warn('[Capacitor] Native features not available:', error)
      }
    }
    
    initializeCapacitor()
  }, [])

  // Clear any stale media globals on mount
  React.useEffect(() => {
    (window as any).__allowAutoPreview = false
    try { delete (window as any).__skipLocalVideoEl } catch {}
  }, [])

  return (
    <AppProviders>
      <IOSAppShell>
        <AppContent />
      </IOSAppShell>
    </AppProviders>
  )
}

function AppContent() {
  // Always call hooks unconditionally at the top level
  const live = useLive()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Enable V2 session invites (fan-side)
  useSessionInvites()
  
  // Post-call rating modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    sessionId: string
    creatorId: string
    creatorName: string
    creatorBio: string
    creatorAvatarUrl: string
  } | null>(null)

  // Compute derived values after hooks
  const isLive = live?.isLive || false

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
  
  return (
    <div 
      className={cn(
        "transition-all duration-300 ease-in-out",
        isLive ? 'pb-[40px]' : ''  // LSB height for content padding
      )}
      style={{
        '--lsb-height': isLive ? '40px' : '0px'
      } as React.CSSProperties}
    >
      <AppRouter />
      <PWAInstallPrompt />
      
      {/* Pre-Call Lobby - Mount when in SESSION_PREP state */}
      {live?.state === 'SESSION_PREP' && (
        <PreCallLobby 
          onBack={() => live?.store?.dispatch({ type: 'START_FAILED' })}
        />
      )}

      {/* Post-Call Rating Modal */}
      {modalOpen && modalData && (
        <PostCallRatingModal
          open={modalOpen}
          onClose={handleModalClose}
          sessionId={modalData.sessionId}
          creatorId={modalData.creatorId}
          creatorName={modalData.creatorName}
          creatorBio={modalData.creatorBio}
          creatorAvatarUrl={modalData.creatorAvatarUrl}
        />
      )}
    </div>
  )
}

export default App