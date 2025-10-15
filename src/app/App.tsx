// Main app component using new architecture
import React from 'react'
import { cn } from '@/lib/utils'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { LiveControlBar } from '@/components/live/LiveControlBar'
import PreCallLobby from '@/components/live/PreCallLobby'
import { useLive } from '@/hooks/live'
import { useSessionInvites } from '@/hooks/useSessionInvites'
import { QueueManagerMount } from './providers/QueueManagerMount'

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
  
  // Enable V2 session invites (fan-side)
  useSessionInvites()
  
  // Compute derived values after hooks
  const isLive = live?.isLive || false
  
  return (
    <>
      {/* Single mount point for queue manager - prevents multi-mount loops */}
      <QueueManagerMount />
      
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
      </div>
    </>
  )
}

export default App