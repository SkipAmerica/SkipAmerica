// Main app component using new architecture
import React from 'react'
import { cn } from '@/lib/utils'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { LiveControlBar } from '@/components/live/LiveControlBar'
import { useLive } from '@/hooks/live'

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
  
  // Compute derived values after hooks
  const isLive = live?.isLive || false
  
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
    </div>
  )
}

export default App