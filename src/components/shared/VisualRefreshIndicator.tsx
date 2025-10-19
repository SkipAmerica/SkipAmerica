import { StretchingSkipLogo } from './StretchingSkipLogo'

interface VisualRefreshIndicatorProps {
  pullDistance: number
  pullVelocity: number
  pullState: 'idle' | 'pulling' | 'releasing' | 'refreshing'
  stretchFactor: number
  backgroundColor?: string
  logoColor?: string
}

/**
 * Visual-only refresh indicator that appears between sticky headers and content
 * Mirrors the pull state from the functional PullToRefreshContainer
 */
export function VisualRefreshIndicator({
  pullDistance,
  pullVelocity,
  pullState,
  stretchFactor,
  backgroundColor = 'rgb(242,242,247)', // iOS gray
  logoColor = 'rgb(142,142,147)', // iOS dark gray
}: VisualRefreshIndicatorProps) {
  return (
    <div
      className="overflow-hidden pointer-events-none"
      style={{
        height: `${Math.min(pullDistance, 40)}px`, // Grows from 0 to 40px
        opacity: pullDistance > 0 ? 1 : 0,
        transition: pullState === 'pulling' 
          ? 'none' // No transition during active pull
          : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring back
        backgroundColor,
        backgroundImage: `
          radial-gradient(circle, rgba(142, 142, 147, 0.08) 1px, transparent 1px),
          radial-gradient(circle, rgba(142, 142, 147, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '12px 12px, 20px 20px',
        backgroundPosition: '0 0, 10px 10px',
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)', // Drop shadow effect
      }}
    >
      <div className="flex items-center justify-center h-full">
        <StretchingSkipLogo
          stretchFactor={stretchFactor}
          velocity={pullVelocity}
          isRefreshing={pullState === 'refreshing'}
          color={logoColor}
        />
      </div>
    </div>
  )
}
