import { ReactNode, useEffect } from 'react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { StretchingSkipLogo } from './StretchingSkipLogo'

interface PullToRefreshContainerProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  scrollElement: HTMLElement | null
  revealAreaOffset?: number // Distance from top (accounts for sticky headers)
  backgroundColor?: string
  logoColor?: string
  enabled?: boolean
  pullThreshold?: number
  pullMax?: number
  visualOnly?: boolean // Make top reveal area invisible (white, no logo)
  onPullStateChange?: (state: {
    pullDistance: number
    pullVelocity: number
    pullState: 'idle' | 'pulling' | 'releasing' | 'refreshing'
    stretchFactor: number
  }) => void
}

export function PullToRefreshContainer({
  children,
  onRefresh,
  scrollElement,
  revealAreaOffset = 0,
  backgroundColor = 'rgb(242,242,247)', // iOS gray
  logoColor = 'rgb(142,142,147)', // iOS dark gray
  enabled = true,
  pullThreshold = 30,
  pullMax = 60,
  visualOnly = false,
  onPullStateChange,
}: PullToRefreshContainerProps) {
  const { pullDistance, pullVelocity, pullState, stretchFactor, containerRef } = usePullToRefresh({
    onRefresh,
    scrollElement,
    enabled,
    pullThreshold,
    pullMax,
  })

  // Notify parent of pull state changes for external visual indicators
  useEffect(() => {
    onPullStateChange?.({
      pullDistance,
      pullVelocity,
      pullState,
      stretchFactor,
    })
  }, [pullDistance, pullVelocity, pullState, stretchFactor, onPullStateChange])

  return (
    <div ref={containerRef} className="relative">
      {/* Reveal Area - Positioned above viewport, slides down during pull */}
      <div
        className="absolute left-0 right-0 overflow-hidden pointer-events-none pull-refresh-reveal"
        style={{
          top: `-${pullMax}px`, // Hidden above viewport
          height: `${pullMax}px`,
          transform: `translateY(${pullDistance}px)`, // Slides down 0-60px
          opacity: pullDistance > 0 ? 1 : 0, // Only visible when pulling
          transition: pullState === 'pulling' 
            ? 'none' // No transition during active pull
            : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring back
          zIndex: 5,
          backgroundColor: visualOnly ? 'white' : backgroundColor,
          backgroundImage: visualOnly ? 'none' : `
            radial-gradient(circle, rgba(142, 142, 147, 0.08) 1px, transparent 1px),
            radial-gradient(circle, rgba(142, 142, 147, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px, 20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      >
        {!visualOnly && (
          <div className="flex items-center justify-center h-full">
            <StretchingSkipLogo
              stretchFactor={stretchFactor}
              velocity={pullVelocity}
              isRefreshing={pullState === 'refreshing'}
              color={logoColor}
            />
          </div>
        )}
      </div>

      {/* Actual Content */}
      <div 
        className="relative z-10"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullState === 'pulling' 
            ? 'none' 
            : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
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
