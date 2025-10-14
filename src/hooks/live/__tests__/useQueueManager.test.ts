import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQueueManager } from '../useQueueManager';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockResolvedValue({ count: 5, error: null }),
    })),
  },
}));

vi.mock('@/app/providers/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/stores/live-store', () => ({
  useLiveStore: () => ({
    queueCount: 0,
    updateQueueCount: vi.fn(),
    triggerHaptic: vi.fn(),
  }),
}));

describe('useQueueManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe only once even with re-renders', () => {
    const { rerender } = renderHook(() => useQueueManager(true));
    const { supabase } = require('@/integrations/supabase/client');
    
    rerender();
    rerender();
    
    expect(supabase.channel).toHaveBeenCalledTimes(1);
  });

  it('should return queue manager interface', () => {
    const { result } = renderHook(() => useQueueManager(true));
    
    expect(result.current.queueCount).toBeDefined();
    expect(result.current.isConnected).toBeDefined();
    expect(result.current.updateQueueCount).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useQueueManager(true));
    const { supabase } = require('@/integrations/supabase/client');
    
    unmount();
    
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
