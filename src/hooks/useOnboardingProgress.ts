import { useState, useEffect, useCallback } from 'react';
import { ProfileProgressTracker, OnboardingState } from '@/lib/onboarding/ProfileProgressTracker';

interface UseOnboardingProgressReturn {
  state: OnboardingState | null;
  loading: boolean;
  error: string | null;
  markPhotoComplete: (url: string) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  setTagline: (text: string) => Promise<void>;
  setIndustries: (tags: string[]) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOnboardingProgress(creatorId: string): UseOnboardingProgressReturn {
  const [tracker] = useState(() => new ProfileProgressTracker(creatorId));
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const newState = await tracker.syncFromServer();
      setState(newState);
    } catch (err) {
      console.error('Failed to sync onboarding progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  }, [tracker]);

  useEffect(() => {
    refresh();

    // Subscribe to progress changes
    const unsubProgress = tracker.onProgressChanged(({ newPercent }) => {
      console.log('Onboarding progress updated:', newPercent);
    });

    const unsubUnlock = tracker.onUnlockSearch(() => {
      console.log('Search unlocked!');
    });

    return () => {
      unsubProgress();
      unsubUnlock();
    };
  }, [tracker, refresh]);

  const markPhotoComplete = useCallback(async (url: string) => {
    try {
      await tracker.markPhotoComplete(url);
      setState(tracker.getState());
    } catch (err) {
      console.error('Failed to mark photo complete:', err);
      throw err;
    }
  }, [tracker]);

  const setDisplayName = useCallback(async (name: string) => {
    try {
      await tracker.setDisplayName(name);
      setState(tracker.getState());
    } catch (err) {
      console.error('Failed to set display name:', err);
      throw err;
    }
  }, [tracker]);

  const setTagline = useCallback(async (text: string) => {
    try {
      await tracker.setTagline(text);
      setState(tracker.getState());
    } catch (err) {
      console.error('Failed to set tagline:', err);
      throw err;
    }
  }, [tracker]);

  const setIndustries = useCallback(async (tags: string[]) => {
    try {
      await tracker.setIndustries(tags);
      setState(tracker.getState());
    } catch (err) {
      console.error('Failed to set industries:', err);
      throw err;
    }
  }, [tracker]);

  const skipOnboarding = useCallback(async () => {
    try {
      await tracker.skipOnboarding();
      setState(tracker.getState());
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
      throw err;
    }
  }, [tracker]);

  return {
    state,
    loading,
    error,
    markPhotoComplete,
    setDisplayName,
    setTagline,
    setIndustries,
    skipOnboarding,
    refresh,
  };
}
