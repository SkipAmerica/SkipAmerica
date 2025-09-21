import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { LiveControlBar } from '../LiveControlBar'

// Access screen from testing-library/react
import * as React from 'react'
const { screen, fireEvent } = require('@testing-library/react')

// Mock the useLive hook
const mockUseLive = vi.fn()
vi.mock('@/hooks/live', () => ({
  useLive: () => mockUseLive()
}))

// Mock the QueueDrawer component
vi.mock('../QueueDrawer', () => ({
  QueueDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="queue-drawer">
      <button onClick={onClose}>Close Queue</button>
    </div> : null
  )
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('LiveControlBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when offline', () => {
    mockUseLive.mockReturnValue({
      isLive: false,
      state: 'OFFLINE',
      queueCount: 0,
      elapsedTime: '00:00',
      earningsDisplay: '0 / $0',
      rightDisplayMode: 'time',
      toggleRightDisplay: vi.fn()
    })

    render(<LiveControlBar />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('should render when starting', () => {
    mockUseLive.mockReturnValue({
      isLive: false,
      state: 'STARTING',
      queueCount: 0,
      elapsedTime: '00:00',
      earningsDisplay: '0 / $0',
      rightDisplayMode: 'time',
      toggleRightDisplay: vi.fn()
    })

    render(<LiveControlBar />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByText('Going Live...')).toBeInTheDocument()
  })

  it('should render when live', () => {
    mockUseLive.mockReturnValue({
      isLive: true,
      state: 'LIVE',
      queueCount: 3,
      elapsedTime: '05:30',
      earningsDisplay: '2 / $50',
      rightDisplayMode: 'time',
      toggleRightDisplay: vi.fn()
    })

    render(<LiveControlBar />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // queue count
    expect(screen.getByText('05:30')).toBeInTheDocument() // elapsed time
  })

  it('should render when ending', () => {
    mockUseLive.mockReturnValue({
      isLive: false,
      state: 'ENDING',
      queueCount: 0,
      elapsedTime: '10:45',
      earningsDisplay: '5 / $125',
      rightDisplayMode: 'time',
      toggleRightDisplay: vi.fn()
    })

    render(<LiveControlBar />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByText('Ending...')).toBeInTheDocument()
  })

  it('should toggle between time and earnings display', () => {
    const mockToggleRightDisplay = vi.fn()
    
    // Start with time display
    mockUseLive.mockReturnValue({
      isLive: true,
      state: 'LIVE',
      queueCount: 2,
      elapsedTime: '03:15',
      earningsDisplay: '1 / $25',
      rightDisplayMode: 'time',
      toggleRightDisplay: mockToggleRightDisplay
    })

    const { rerender } = render(<LiveControlBar />)
    
    // Should show time initially
    expect(screen.getByText('03:15')).toBeInTheDocument()
    
    // Click the toggle button
    const toggleButton = screen.getByRole('button', { name: /03:15/ })
    fireEvent.click(toggleButton)
    expect(mockToggleRightDisplay).toHaveBeenCalledOnce()
    
    // Update mock to show earnings
    mockUseLive.mockReturnValue({
      isLive: true,
      state: 'LIVE',
      queueCount: 2,
      elapsedTime: '03:15',
      earningsDisplay: '1 / $25',
      rightDisplayMode: 'earnings',
      toggleRightDisplay: mockToggleRightDisplay
    })
    
    rerender(<LiveControlBar />)
    expect(screen.getByText('1 / $25')).toBeInTheDocument()
  })

  it('should open and close queue drawer', () => {
    mockUseLive.mockReturnValue({
      isLive: true,
      state: 'LIVE',
      queueCount: 5,
      elapsedTime: '02:00',
      earningsDisplay: '3 / $75',
      rightDisplayMode: 'time',
      toggleRightDisplay: vi.fn()
    })

    render(<LiveControlBar />)
    
    // Queue drawer should not be visible initially
    expect(screen.queryByTestId('queue-drawer')).not.toBeInTheDocument()
    
    // Click queue button
    const queueButton = screen.getByRole('button', { name: /5/ })
    fireEvent.click(queueButton)
    
    // Queue drawer should be visible
    expect(screen.getByTestId('queue-drawer')).toBeInTheDocument()
    
    // Close the drawer
    fireEvent.click(screen.getByText('Close Queue'))
    expect(screen.queryByTestId('queue-drawer')).not.toBeInTheDocument()
  })

  it('should prevent rapid toggling of right display', () => {
    const mockToggleRightDisplay = vi.fn()
    
    mockUseLive.mockReturnValue({
      isLive: true,
      state: 'LIVE',
      queueCount: 1,
      elapsedTime: '01:30',
      earningsDisplay: '0 / $0',
      rightDisplayMode: 'time',
      toggleRightDisplay: mockToggleRightDisplay
    })

    render(<LiveControlBar />)
    
    const toggleButton = screen.getByRole('button', { name: /01:30/ })
    
    // Rapid clicks
    fireEvent.click(toggleButton)
    fireEvent.click(toggleButton)
    fireEvent.click(toggleButton)
    
    // Should only call once due to debouncing
    expect(mockToggleRightDisplay).toHaveBeenCalledOnce()
  })
})