import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'

function App() {
  console.log('Skip app is loading...')
  
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
