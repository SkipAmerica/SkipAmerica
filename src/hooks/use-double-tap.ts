import { useCallback, useRef } from 'react'

interface UseDoubleTapOptions {
  onDoubleTap: () => void
  delay?: number // ms between taps to count as double-tap
}

export function useDoubleTap({ onDoubleTap, delay = 400 }: UseDoubleTapOptions) {
  const lastTapTime = useRef<number>(0)
  const tapCount = useRef<number>(0)

  const onTapStart = useCallback((e: React.PointerEvent) => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime.current

    if (timeSinceLastTap < delay) {
      // Double tap detected
      tapCount.current = 0
      lastTapTime.current = 0
      onDoubleTap()
    } else {
      // First tap or too slow
      tapCount.current = 1
      lastTapTime.current = now
    }
  }, [onDoubleTap, delay])

  return { onTapStart, tapCount: tapCount.current }
}
