interface StretchingSkipLogoProps {
  stretchFactor: number // 0-1
  velocity: number // pixels/ms
  isRefreshing: boolean
  color?: string
}

export function StretchingSkipLogo({
  stretchFactor,
  velocity,
  isRefreshing,
  color = 'rgb(142,142,147)', // iOS dark gray
}: StretchingSkipLogoProps) {
  // Logo grows and stretches as user pulls further (adjusted for 80px pull)
  const scaleY = 1 + (stretchFactor * 0.8) // 1.0 → 1.8
  const scaleX = 1 + (stretchFactor * 0.4) // 1.0 → 1.4
  const fontSize = 36 + (stretchFactor * 36) // 36px → 72px
  const opacity = 0.3 + (stretchFactor * 0.7) // 0.3 → 1.0

  // Velocity adds slight rotation for dynamism
  const rotation = Math.min(velocity * 0.3, 10) // Max 10deg

  return (
    <>
      <div
        style={{
          fontSize: `${fontSize}px`,
          transform: `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
          opacity,
          color,
          transformOrigin: 'center bottom',
          willChange: 'transform',
          transition: isRefreshing ? 'none' : 'transform 0.1s ease-out',
          animation: isRefreshing ? 'skipPulse 1s ease-out infinite' : 'none',
        }}
        className="font-bold select-none"
      >
        <span>Sk</span>
        <span className="relative">
          <span>i</span>
          <span 
            className="absolute rounded-full"
            style={{
              top: '-0.5em',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0.2em',
              height: '0.2em',
              backgroundColor: color,
            }}
          />
        </span>
        <span>p</span>
      </div>

      {isRefreshing && (
        <style>{`
          @keyframes skipPulse {
            0%, 100% { 
              transform: scale(1); 
              opacity: 0.8; 
            }
            50% { 
              transform: scale(1.1); 
              opacity: 1; 
            }
          }
        `}</style>
      )}
    </>
  )
}
