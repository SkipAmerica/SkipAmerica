import { describe, it, expect } from 'vitest'
import { transition, canGoLive, canEndLive, isTransitioning, isLive, type LiveState, type LiveEvent } from '../use-live-state-machine'

describe('useLiveStateMachine', () => {
  describe('transition function', () => {
    describe('OFFLINE state', () => {
      it('should transition to STARTING on GO_LIVE', () => {
        const result = transition('OFFLINE', { type: 'GO_LIVE' })
        expect(result).toBe('STARTING')
      })

      it('should stay OFFLINE on RESET', () => {
        const result = transition('OFFLINE', { type: 'RESET' })
        expect(result).toBe('OFFLINE')
      })

      it('should be no-op on invalid events', () => {
        const invalidEvents: LiveEvent[] = [
          { type: 'LIVE_STARTED' },
          { type: 'START_FAILED' },
          { type: 'END_LIVE' },
          { type: 'LIVE_ENDED' },
          { type: 'END_FAILED' }
        ]

        invalidEvents.forEach(event => {
          const result = transition('OFFLINE', event)
          expect(result).toBe('OFFLINE')
        })
      })
    })

    describe('STARTING state', () => {
      it('should transition to LIVE on LIVE_STARTED', () => {
        const result = transition('STARTING', { type: 'LIVE_STARTED' })
        expect(result).toBe('LIVE')
      })

      it('should transition to OFFLINE on START_FAILED', () => {
        const result = transition('STARTING', { type: 'START_FAILED' })
        expect(result).toBe('OFFLINE')
      })

      it('should transition to OFFLINE on RESET', () => {
        const result = transition('STARTING', { type: 'RESET' })
        expect(result).toBe('OFFLINE')
      })

      it('should be no-op on invalid events', () => {
        const invalidEvents: LiveEvent[] = [
          { type: 'GO_LIVE' },
          { type: 'END_LIVE' },
          { type: 'LIVE_ENDED' },
          { type: 'END_FAILED' }
        ]

        invalidEvents.forEach(event => {
          const result = transition('STARTING', event)
          expect(result).toBe('STARTING')
        })
      })
    })

    describe('LIVE state', () => {
      it('should transition to ENDING on END_LIVE', () => {
        const result = transition('LIVE', { type: 'END_LIVE' })
        expect(result).toBe('ENDING')
      })

      it('should transition to OFFLINE on RESET', () => {
        const result = transition('LIVE', { type: 'RESET' })
        expect(result).toBe('OFFLINE')
      })

      it('should be no-op on invalid events', () => {
        const invalidEvents: LiveEvent[] = [
          { type: 'GO_LIVE' },
          { type: 'LIVE_STARTED' },
          { type: 'START_FAILED' },
          { type: 'LIVE_ENDED' },
          { type: 'END_FAILED' }
        ]

        invalidEvents.forEach(event => {
          const result = transition('LIVE', event)
          expect(result).toBe('LIVE')
        })
      })
    })

    describe('ENDING state', () => {
      it('should transition to OFFLINE on LIVE_ENDED', () => {
        const result = transition('ENDING', { type: 'LIVE_ENDED' })
        expect(result).toBe('OFFLINE')
      })

      it('should transition to LIVE on END_FAILED', () => {
        const result = transition('ENDING', { type: 'END_FAILED' })
        expect(result).toBe('LIVE')
      })

      it('should transition to OFFLINE on RESET', () => {
        const result = transition('ENDING', { type: 'RESET' })
        expect(result).toBe('OFFLINE')
      })

      it('should be no-op on invalid events', () => {
        const invalidEvents: LiveEvent[] = [
          { type: 'GO_LIVE' },
          { type: 'LIVE_STARTED' },
          { type: 'START_FAILED' },
          { type: 'END_LIVE' }
        ]

        invalidEvents.forEach(event => {
          const result = transition('ENDING', event)
          expect(result).toBe('ENDING')
        })
      })
    })

    it('should handle invalid state gracefully', () => {
      const result = transition('INVALID' as any, { type: 'GO_LIVE' })
      expect(result).toBe('OFFLINE')
    })
  })

  describe('validation helpers', () => {
    describe('canGoLive', () => {
      it('should return true only for OFFLINE state', () => {
        expect(canGoLive('OFFLINE')).toBe(true)
        expect(canGoLive('STARTING')).toBe(false)
        expect(canGoLive('LIVE')).toBe(false)
        expect(canGoLive('ENDING')).toBe(false)
      })
    })

    describe('canEndLive', () => {
      it('should return true only for LIVE state', () => {
        expect(canEndLive('OFFLINE')).toBe(false)
        expect(canEndLive('STARTING')).toBe(false)
        expect(canEndLive('LIVE')).toBe(true)
        expect(canEndLive('ENDING')).toBe(false)
      })
    })

    describe('isTransitioning', () => {
      it('should return true for STARTING and ENDING states', () => {
        expect(isTransitioning('OFFLINE')).toBe(false)
        expect(isTransitioning('STARTING')).toBe(true)
        expect(isTransitioning('LIVE')).toBe(false)
        expect(isTransitioning('ENDING')).toBe(true)
      })
    })

    describe('isLive', () => {
      it('should return true only for LIVE state', () => {
        expect(isLive('OFFLINE')).toBe(false)
        expect(isLive('STARTING')).toBe(false)
        expect(isLive('LIVE')).toBe(true)
        expect(isLive('ENDING')).toBe(false)
      })
    })
  })
})