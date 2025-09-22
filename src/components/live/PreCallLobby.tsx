import { useEffect } from 'react'

interface PreCallLobbyProps {
  // Future: add activeInvite, device controls, etc.
}

export function PreCallLobby({}: PreCallLobbyProps) {
  // Add/remove dimming class on mount/unmount
  useEffect(() => {
    document.documentElement.classList.add('precall-open')
    return () => {
      document.documentElement.classList.remove('precall-open')
    }
  }, [])

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-background flex flex-col safe-area-insets"
      role="dialog"
      aria-labelledby="precall-header"
      aria-modal="true"
    >
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b">
        <h1 id="precall-header" className="text-xl font-semibold text-center">
          Pre-Call Lobby
        </h1>
      </header>

      {/* Body - Placeholder for now */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Previews & checks will appear here.</p>
        </div>
      </main>
    </div>
  )
}