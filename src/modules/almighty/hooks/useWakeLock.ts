import { useEffect, useRef } from 'react'

export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const noopIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      // Release wake lock when disabled
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
      if (noopIntervalRef.current) {
        clearInterval(noopIntervalRef.current)
        noopIntervalRef.current = null
      }
      return
    }
    
    const requestWakeLock = async () => {
      if (typeof window === 'undefined') return

      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          if (process.env.NODE_ENV !== 'production') {
            console.log('[WakeLock] Screen wake lock acquired')
          }
        } else {
          // Fallback for older Android browsers
          noopIntervalRef.current = window.setInterval(() => {
            // Periodic no-op to prevent sleep
          }, 15000)
          if (process.env.NODE_ENV !== 'production') {
            console.log('[WakeLock] Using fallback method')
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[WakeLock] Failed to acquire:', err)
        }
      }
    }

    requestWakeLock()
    
    // Re-acquire on visibility change (if still enabled)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock()
      } else {
        wakeLockRef.current?.release()
        wakeLockRef.current = null
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        if (process.env.NODE_ENV !== 'production') {
          console.log('[WakeLock] Released')
        }
      }
      if (noopIntervalRef.current) {
        clearInterval(noopIntervalRef.current)
      }
    }
  }, [enabled])
}
