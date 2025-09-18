// Main app component using new architecture
import { AppProviders } from './providers'
import { AppRouter } from './router'
import { PWAInstallPrompt } from '@/components/mobile/PWAInstallPrompt'
import { IOSAppShell } from '@/components/mobile/IOSAppShell'

function App() {
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