import { describe, it, expect } from 'vitest'
import { transition, canGoLive, canEndLive, isTransitioning, isLive, canInitMedia, type LiveState, type LiveEvent } from '../use-live-state-machine'

describe('Live State Machine', () => {
  describe('canInitMedia', () => {
    it('should return true only for SESSION_PREP and SESSION_JOINING', () => {
      expect(canInitMedia('SESSION_PREP')).toBe(true)
      expect(canInitMedia('SESSION_JOINING')).toBe(true)
      expect(canInitMedia('OFFLINE')).toBe(false)
      expect(canInitMedia('DISCOVERABLE')).toBe(false)
      expect(canInitMedia('SESSION_ACTIVE')).toBe(false)
      expect(canInitMedia('TEARDOWN')).toBe(false)
    })
  })
})