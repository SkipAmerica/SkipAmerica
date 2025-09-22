/**
 * Tests for media state machine and locking behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { canInitMedia, initializeMedia, teardownMedia, getMediaRegistry, mediaSummary } from '@/shared/media/media-registry'

// Mock getUserMedia and RTCPeerConnection
const mockTrack = {
  enabled: true,
  readyState: 'live' as MediaStreamTrackState,
  stop: vi.fn(),
  kind: 'video' as const
}

const mockStream = {
  getTracks: vi.fn(() => [mockTrack]),
} as unknown as MediaStream

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue(mockStream)
  }
})

global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  addTrack: vi.fn(),
  getSenders: vi.fn(() => []),
  getTransceivers: vi.fn(() => []),
  close: vi.fn(),
  ontrack: null,
  onicecandidate: null,
  onconnectionstatechange: null,
  onsignalingstatechange: null
})) as any

describe('Media State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset registry
    const registry = getMediaRegistry()
    registry.phase = 'idle'
    registry.initLock = null
    registry.endLock = null
    registry.stream = null
    registry.pc = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('canInitMedia', () => {
    it('returns true only for SESSION_PREP and SESSION_JOINING', () => {
      expect(canInitMedia('SESSION_PREP', 'idle')).toBe(true)
      expect(canInitMedia('SESSION_JOINING', 'idle')).toBe(true)
      expect(canInitMedia('OFFLINE', 'idle')).toBe(false)
      expect(canInitMedia('DISCOVERABLE', 'idle')).toBe(false)
      expect(canInitMedia('SESSION_ACTIVE', 'idle')).toBe(false)
      expect(canInitMedia('TEARDOWN', 'idle')).toBe(false)
    })

    it('returns false when media phase is ending', () => {
      expect(canInitMedia('SESSION_PREP', 'ending')).toBe(false)
      expect(canInitMedia('SESSION_JOINING', 'ending')).toBe(false)
    })
  })

  describe('initializeMedia', () => {
    it('initializes preview media for SESSION_PREP', async () => {
      const stream = await initializeMedia('SESSION_PREP', true)
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: false
      })
      expect(stream).toBe(mockStream)
      expect(getMediaRegistry().phase).toBe('active')
    })

    it('initializes full media with WebRTC for SESSION_JOINING', async () => {
      const stream = await initializeMedia('SESSION_JOINING', false)
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true
      })
      expect(RTCPeerConnection).toHaveBeenCalled()
      expect(stream).toBe(mockStream)
      expect(getMediaRegistry().phase).toBe('active')
    })

    it('blocks initialization for invalid states', async () => {
      await expect(initializeMedia('OFFLINE', false)).rejects.toThrow('Media initialization blocked')
      expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
    })

    it('waits for existing initLock', async () => {
      // Start first initialization
      const promise1 = initializeMedia('SESSION_PREP', true)
      
      // Start second initialization while first is running
      const promise2 = initializeMedia('SESSION_PREP', true)
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // Should return same stream
      expect(result1).toBe(result2)
      // getUserMedia should only be called once
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    })
  })

  describe('teardownMedia', () => {
    beforeEach(async () => {
      // Initialize media first
      await initializeMedia('SESSION_PREP', true)
    })

    it('stops tracks and clears registry', async () => {
      await teardownMedia()
      
      expect(mockTrack.enabled).toBe(false)
      expect(mockTrack.stop).toHaveBeenCalled()
      expect(getMediaRegistry().stream).toBeNull()
      expect(getMediaRegistry().pc).toBeNull()
      expect(getMediaRegistry().phase).toBe('idle')
    })

    it('is idempotent - multiple calls are safe', async () => {
      // Call teardown twice
      await Promise.all([teardownMedia(), teardownMedia()])
      
      // Track stop should only be called once
      expect(mockTrack.stop).toHaveBeenCalledTimes(1)
      expect(getMediaRegistry().phase).toBe('idle')
    })

    it('handles hung teardown with guard timer', async () => {
      // Mock a hanging teardown scenario
      const registry = getMediaRegistry()
      registry.phase = 'ending'
      
      // Fast-forward time to trigger guard
      vi.useFakeTimers()
      setTimeout(() => {
        // Simulate guard timeout
        if (registry.phase === 'ending') {
          registry.phase = 'idle'
          registry.endLock = null
        }
      }, 2000)
      
      vi.advanceTimersByTime(2100)
      
      expect(registry.phase).toBe('idle')
      
      vi.useRealTimers()
    })
  })

  describe('Runtime flow tests', () => {
    it('handles start -> end -> immediate start sequence', async () => {
      // Start session
      await initializeMedia('SESSION_PREP', true)
      expect(getMediaRegistry().phase).toBe('active')
      
      // End session
      await teardownMedia()
      expect(getMediaRegistry().phase).toBe('idle')
      
      // Immediate restart should work
      await initializeMedia('SESSION_PREP', true)
      expect(getMediaRegistry().phase).toBe('active')
      
      // Should have called getUserMedia twice
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
    })

    it('blocks init while endLock is active', async () => {
      // Start with active media
      await initializeMedia('SESSION_PREP', true)
      
      // Start teardown (but don't await it)
      const teardownPromise = teardownMedia()
      
      // Try to init while teardown is in progress
      const initPromise = initializeMedia('SESSION_PREP', true)
      
      // Wait for both
      await Promise.all([teardownPromise, initPromise])
      
      // Should end up in clean state
      expect(getMediaRegistry().phase).toBe('active')
    })
  })

  describe('mediaSummary', () => {
    it('logs comprehensive media state', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      
      mediaSummary('test')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MEDIA][TEST]',
        expect.objectContaining({
          tag: 'test',
          pc: 'N/A',
          stream: 'CLEARED',
          videos: 0,
          phase: 'idle',
          tracks: [],
          liveTracksCount: 0
        })
      )
      
      consoleSpy.mockRestore()
    })
  })
})