// Refactored discovery mode toggle component
import { Button } from '@/components/ui/button'
import { Handshake, Grid3X3, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DiscoveryMode } from '../types'

interface DiscoveryModeToggleProps {
  mode: DiscoveryMode
  onModeChange: (mode: DiscoveryMode) => void
  className?: string
}

export function DiscoveryModeToggle({ mode, onModeChange, className }: DiscoveryModeToggleProps) {
  const handleModeChange = (newMode: DiscoveryMode) => {
    onModeChange(newMode)
  }

  const modes = [
    { key: 'discover' as const, label: 'Discover', icon: Search },
    { key: 'browse' as const, label: 'Browse', icon: Grid3X3 },
    { key: 'match' as const, label: 'Match', icon: Handshake },
  ]

  return (
    <div className={cn(
      'flex items-center bg-muted overflow-hidden gap-0 w-full px-0 rounded-lg border border-border h-10 mb-4',
      className
    )}>
      {modes.map((modeConfig, index) => {
        const Icon = modeConfig.icon
        const isActive = mode === modeConfig.key
        const isFirst = index === 0
        const isLast = index === modes.length - 1

        return (
          <Button
            key={modeConfig.key}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange(modeConfig.key)}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 transition-all px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8',
              {
                'rounded-r-none': !isLast,
                'rounded-l-none': !isFirst,
                'bg-cyan-500 text-white hover:bg-cyan-600': isActive,
                'hover:bg-muted/50 hover:text-foreground': !isActive,
              }
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{modeConfig.label}</span>
          </Button>
        )
      })}
    </div>
  )
}