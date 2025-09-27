// Main app component using new architecture
import React from 'react'
import { cn } from '@/lib/utils'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { LiveControlBar } from '@/components/live/LiveControlBar'
import Lobby from '@/pages/Lobby'
import { useLive } from '@/hooks/live'
import { useAuth } from './providers/auth-provider'
import { useProfile } from '@/hooks/useProfile'

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
          
          // Configure iOS status bar
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setBackgroundColor({ color: "#F4FDFB" })
          await StatusBar.setStyle({ style: Style.Dark }) // Dark so icons are visible on light background
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
  const { user } = useAuth()
  const { profile } = useProfile()
  
  // Compute derived values after hooks
  const isLive = live?.isLive || false
  
  // Create props for Lobby component
  const creator = {
    id: user?.id || '',
    name: profile?.full_name || user?.email || 'Creator',
    avatar: profile?.avatar_url,
    customLobbyMedia: undefined,
    lobbyMessage: undefined
  }
  
  const caller = {
    id: 'placeholder-caller',
    name: 'Waiting for caller...',
    avatar: undefined
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
      <LiveControlBar />
      
      {/* Creator Lobby - Mount when in SESSION_PREP state */}
      {live?.state === 'SESSION_PREP' && (
        <Lobby 
          creator={creator}
          caller={caller}
          isCreatorView={true}
        />
      )}
    </div>
  )
}

export default App