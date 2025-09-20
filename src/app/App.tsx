// Main app component using new architecture
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
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