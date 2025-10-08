import { describe, it, expect } from 'vitest'

// Mock snap logic (extracted from useSwipeGestures for testing)
function snapToPane(
  currentPane: number,
  deltaX: number,
  velocity: number,
  prefersReducedMotion: boolean,
  windowWidth: number = 375
): number {
  const threshold = windowWidth * 0.3

  // Disable velocity flings for reduced motion
  if (!prefersReducedMotion && Math.abs(velocity) > 0.5) {
    const targetPane = velocity < 0 ? currentPane + 1 : currentPane - 1
    return Math.max(0, Math.min(2, targetPane))
  }

  // Distance-based threshold
  let targetPane = currentPane
  if (deltaX > threshold) targetPane = currentPane - 1
  else if (deltaX < -threshold) targetPane = currentPane + 1

  return Math.max(0, Math.min(2, targetPane))
}

describe('snapToPane', () => {
  it('should snap to next pane on fast leftward fling', () => {
    expect(snapToPane(1, -50, -0.6, false)).toBe(2)
  })

  it('should snap to previous pane on fast rightward fling', () => {
    expect(snapToPane(1, 50, 0.6, false)).toBe(0)
  })

  it('should use distance threshold when velocity is low', () => {
    expect(snapToPane(1, 150, 0.2, false, 375)).toBe(0) // 150 > 30% of 375
    expect(snapToPane(1, -150, -0.2, false, 375)).toBe(2)
  })

  it('should clamp to valid pane range', () => {
    expect(snapToPane(0, 200, 1.0, false)).toBe(0) // Can't go below 0
    expect(snapToPane(2, -200, -1.0, false)).toBe(2) // Can't go above 2
  })

  it('should disable velocity flings when reduced motion is enabled', () => {
    expect(snapToPane(1, -50, -0.8, true)).toBe(1) // No snap due to small distance
    expect(snapToPane(1, -150, -0.8, true, 375)).toBe(2) // Distance-based still works
  })

  it('should return current pane if threshold not met', () => {
    expect(snapToPane(1, 50, 0.1, false, 375)).toBe(1) // 50 < 30% of 375
  })
})
