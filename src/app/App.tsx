// Main app component using new architecture
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'
import { LiveControlBar } from '@/components/live/LiveControlBar'
import { useLive } from '@/app/providers/live-provider'

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
  const { isLive } = useLive()

  return (
    <div className={isLive ? 'pb-14' : ''}>
      <AppRouter />
      <PWAInstallPrompt />
      {isLive && <LiveControlBar />}
    </div>
  )
}

export default App