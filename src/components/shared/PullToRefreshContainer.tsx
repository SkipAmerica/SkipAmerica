import { ReactNode } from 'react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { StretchingSkipLogo } from './StretchingSkipLogo'

interface PullToRefreshContainerProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  scrollElement: HTMLElement | null
  revealAreaOffset: number // Distance from top (accounts for sticky headers)
  backgroundColor?: string
  logoColor?: string
  enabled?: boolean
  pullThreshold?: number
  pullMax?: number
}

export function PullToRefreshContainer({
  children,
  onRefresh,
  scrollElement,
  revealAreaOffset,
  backgroundColor = 'rgb(242,242,247)', // iOS gray
  logoColor = 'rgb(142,142,147)', // iOS dark gray
  enabled = true,
  pullThreshold = 80,
  pullMax = 200,
}: PullToRefreshContainerProps) {
  const { pullDistance, pullVelocity, pullState, stretchFactor, containerRef } = usePullToRefresh({
    onRefresh,
    scrollElement,
    enabled,
    pullThreshold,
    pullMax,
  })

  return (
    <div ref={containerRef} className="relative">
      {/* Reveal Area - Positioned above viewport, slides down during pull */}
      <div
        className="absolute left-0 right-0 overflow-hidden pointer-events-none pull-refresh-reveal"
        style={{
          top: `-${pullMax}px`, // Hidden above viewport
          height: `${pullMax}px`,
          transform: `translateY(${pullDistance}px)`, // Slides down 0-200px
          opacity: pullDistance > 0 ? 1 : 0, // Only visible when pulling
          transition: pullState === 'pulling' 
            ? 'none' // No transition during active pull
            : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring back
          zIndex: 5,
          backgroundColor,
          paddingTop: `${revealAreaOffset}px`, // Push logo below sticky headers
        }}
      >
        <div className="flex items-end justify-center h-full pb-8">
          <StretchingSkipLogo
            stretchFactor={stretchFactor}
            velocity={pullVelocity}
            isRefreshing={pullState === 'refreshing'}
            color={logoColor}
          />
        </div>
      </div>

      {/* Actual Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Accessibility: Announce refresh state */}
      {pullState === 'refreshing' && (
        <div className="sr-only" aria-live="polite">
          Refreshing posts...
        </div>
      )}
    </div>
  )
}
