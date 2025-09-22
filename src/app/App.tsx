// Main app component using new architecture
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'
import { cn } from '@/lib/utils'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { LiveControlBar } from '@/components/live/LiveControlBar'
import { useLive } from '@/hooks/live'

function App() {
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      Keyboard.setAccessoryBarVisible({ isVisible: false })
      Keyboard.setResizeMode({ mode: KeyboardResize.None })
      Keyboard.setScroll({ isDisabled: true })
      
      // Configure iOS status bar
      StatusBar.setOverlaysWebView({ overlay: false })
      StatusBar.setBackgroundColor({ color: "#F4FDFB" })
      StatusBar.setStyle({ style: Style.Dark }) // Dark so icons are visible on light background
    }
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