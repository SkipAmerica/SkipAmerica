// Discovery state management provider
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type DiscoveryMode = 'discover' | 'browse' | 'match'
type BrowseMode = 'live' | 'schedule'

interface DiscoveryContextType {
  discoveryMode: DiscoveryMode
  browseMode: BrowseMode
  setDiscoveryMode: (mode: DiscoveryMode) => void
  setBrowseMode: (mode: BrowseMode) => void
  handleDiscoveryModeChange: (mode: DiscoveryMode) => void
  resetToInitialState: () => void
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined)

interface DiscoveryProviderProps {
  children: ReactNode
}

export function DiscoveryProvider({ children }: DiscoveryProviderProps) {
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('discover')
  const [browseMode, setBrowseMode] = useState<BrowseMode>('live')

  const handleDiscoveryModeChange = useCallback((mode: DiscoveryMode) => {
    console.log('DiscoveryProvider - changing from', discoveryMode, 'to', mode)
    setDiscoveryMode(mode)
  }, [discoveryMode])

  const resetToInitialState = useCallback(() => {
    console.log('DiscoveryProvider - resetting to initial state')
    setDiscoveryMode('discover')
    setBrowseMode('live')
  }, [])

  const value: DiscoveryContextType = {
    discoveryMode,
    browseMode,
    setDiscoveryMode,
    setBrowseMode,
    handleDiscoveryModeChange,
    resetToInitialState,
  }

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  )
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (context === undefined) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider')
  }
  return context
}