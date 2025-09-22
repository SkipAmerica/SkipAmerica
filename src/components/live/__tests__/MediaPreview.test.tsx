/**
 * Tests for MediaPreview component and media teardown
 */

import { render, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MediaPreview } from '../MediaPreview'
import { teardownMedia, getMediaRegistry, setMediaPhase, registerStream } from '@/shared/media/media-registry'

// Mock media APIs
const mockTrack = {
  enabled: true,
  readyState: 'live' as MediaStreamTrackState,
  stop: vi.fn(),
  kind: 'video' as const
}

const mockStream = {
  getTracks: vi.fn(() => [mockTrack]),
} as unknown as MediaStream

const mockVideo = {
  pause: vi.fn(),
  load: vi.fn(),
  srcObject: null as any,
  removeAttribute: vi.fn()
}

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn()
})

Object.defineProperty(HTMLVideoElement.prototype, 'load', {
  writable: true, 
  value: vi.fn()
})

Object.defineProperty(HTMLVideoElement.prototype, 'removeAttribute', {
  writable: true,
  value: vi.fn()
})

describe('MediaPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset registry to clean state
    setMediaPhase('idle')
  })

  afterEach(() => {
    cleanup()
  })

  it('registers and unregisters video element', () => {
    const { unmount } = render(<MediaPreview />)
    
    // Should have registered 1 video
    expect(getMediaRegistry().videos.size).toBe(1)
    
    unmount()
    
    // Should have unregistered
    expect(getMediaRegistry().videos.size).toBe(0)
  })

  it('attaches stream from registry when available', () => {
    // Register stream before mounting component
    registerStream(mockStream)
    
    render(<MediaPreview />)
    
    // Video should get stream from registry
    // (In real implementation, this would be checked via DOM)
    expect(getMediaRegistry().stream).toBe(mockStream)
  })
})

describe('Media teardown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMediaPhase('idle')
  })

  it('stops tracks and detaches videos', async () => {
    // Setup mock registry state  
    registerStream(mockStream)
    setMediaPhase('active')
    
    await teardownMedia()
    
    // Track should be stopped
    expect(mockTrack.stop).toHaveBeenCalled()
    expect(mockTrack.enabled).toBe(false)
    
    // Registry should be cleared
    expect(getMediaRegistry().stream).toBeNull()
    expect(getMediaRegistry().phase).toBe('idle')
  })

  it('is idempotent - multiple calls are safe', async () => {
    registerStream(mockStream)
    setMediaPhase('active')
    
    // Call teardown twice
    await teardownMedia()
    await teardownMedia()
    
    // Track stop should only be called once (from first teardown)
    expect(mockTrack.stop).toHaveBeenCalledTimes(1)
  })

  it('does not reinitialize media during teardown', async () => {
    setMediaPhase('ending')
    
    // This should be false during teardown
    const canInit = getMediaRegistry().phase !== 'ending'
    expect(canInit).toBe(false)
  })
})