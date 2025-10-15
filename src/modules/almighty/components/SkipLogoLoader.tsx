import { useEffect, useState } from 'react'

/**
 * SkipLogoLoader - Animated Skip logo shown while waiting for remote video
 * Features:
 * - 3D scale animation (grow to 150%, shrink to 120%)
 * - Accelerates over time (2s → 800ms)
 * - Matches Skip brand identity
 */
export function SkipLogoLoader() {
  const [animationDuration, setAnimationDuration] = useState(2000) // Start at 2s
  
  // Accelerate animation over time for increasing urgency
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationDuration(prev => Math.max(prev - 150, 800)) // Min 800ms
    }, 1000) // Speed up every second
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div
        className="text-white font-bold select-none"
        style={{
          fontSize: '10rem',
          animation: `skipPulse ${animationDuration}ms ease-out infinite`,
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >
        <span>Sk</span>
        <span className="relative">
          <span>i</span>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white rounded-full"></span>
        </span>
        <span>p</span>
      </div>
      
      <style>{`
        @keyframes skipPulse {
          0% {
            transform: scale3d(1, 1, 1);
            opacity: 0.8;
          }
          50% {
            transform: scale3d(1.5, 1.5, 1);
            opacity: 1;
          }
          100% {
            transform: scale3d(1.2, 1.2, 1);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  )
}
