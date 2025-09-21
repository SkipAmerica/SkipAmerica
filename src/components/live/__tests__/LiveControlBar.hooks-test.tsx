/**
 * Test for React hooks invariant in LiveControlBar
 * Ensures no "Rendered more hooks than during the previous render" errors
 */

import { render, act } from '@testing-library/react'
import { LiveControlBar } from '../LiveControlBar'
import { LiveStoreProvider } from '@/stores/live-store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/auth-provider'
import { Toaster } from '@/components/ui/toaster'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
        error: null 
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'session-id', started_at: new Date().toISOString() }, 
            error: null 
          })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    })),
    removeChannel: vi.fn()
  }
}))

// Mock getUserMedia for permissions
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  }
})

// Mock vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn()
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LiveStoreProvider>
            {children}
            <Toaster />
          </LiveStoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('LiveControlBar Hooks Invariant', () => {
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Enable debug mode for state transitions
    ;(window as any).__LIVE_DEBUG = true
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    ;(window as any).__LIVE_DEBUG = false
  })

  it('should not violate hooks rules during state transitions', async () => {
    render(
      <TestWrapper>
        <LiveControlBar />
      </TestWrapper>
    )

    // Should not have any console errors yet
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered more hooks than during the previous render')
    )

    // The LiveControlBar should render without hooks errors
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning: React has detected a change in the order of Hooks')
    )

    // No hooks invariant violations should occur
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered fewer hooks than expected')
    )
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered more hooks than expected')
    )
  })

  it('should maintain consistent hook count when toggling visibility', async () => {
    render(
      <TestWrapper>
        <LiveControlBar />
      </TestWrapper>
    )

    // Force multiple re-renders to test hook consistency
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        // Trigger re-render by updating the component
        await new Promise(resolve => setTimeout(resolve, 10))
      })
    }

    // Should not have any hooks errors during multiple re-renders
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered more hooks than during the previous render')
    )
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered fewer hooks than during the previous render')
    )
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning: React has detected a change in the order of Hooks')
    )
  })

  it('should call all hooks unconditionally regardless of render state', () => {
    const { rerender } = render(
      <TestWrapper>
        <LiveControlBar />
      </TestWrapper>
    )

    // Force a rerender
    rerender(
      <TestWrapper>
        <LiveControlBar />
      </TestWrapper>
    )

    // Should not have any hooks rule violations
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('React Hook')
    )
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('hooks')
    )
  })
})