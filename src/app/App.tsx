// Main app component using new architecture
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'

function App() {
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      Keyboard.setAccessoryBarVisible({ isVisible: false })
      Keyboard.setResizeMode({ mode: KeyboardResize.None })
      Keyboard.setScroll({ isDisabled: true })
      
      // Configure iOS status bar
      StatusBar.setOverlaysWebView({ overlay: false })
      StatusBar.setBackgroundColor({ color: "#38d9a9" }) // turquoise color
      StatusBar.setStyle({ style: Style.Light }) // Light so icons are white on teal
    }
  }, [])

  return (
    <AppProviders>
      <IOSAppShell>
        <AppRouter />
        <PWAInstallPrompt />
      </IOSAppShell>
    </AppProviders>
  )
}

export default App