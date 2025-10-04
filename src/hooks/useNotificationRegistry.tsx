import { ReactNode, useMemo, useState, useEffect } from 'react';
import { ProfileCompletionBanner } from '@/components/creator/ProfileCompletionBanner';
import { useProfile } from './useProfile';
import { useOnboardingProgress } from './useOnboardingProgress';
import { useLocalStorage } from '@/shared/hooks/use-local-storage';
import { NOTIFICATION_CONFIG } from '@/config/notifications';

interface NotificationRegistryItem {
  id: string;
  component: ReactNode;
  isVisible: boolean;
}

interface DismissalState {
  dismissed: boolean;
  timestamp: number;
}

export function useNotificationRegistry() {
  const { profile } = useProfile();
  const { state: onboardingState, loading: onboardingLoading } = useOnboardingProgress(profile?.id || '');
  
  // Profile completion banner dismissal state
  const [profileDismissal, setProfileDismissal] = useLocalStorage<DismissalState>(
    'banner_dismissed_profile_completion',
    { dismissed: false, timestamp: 0 }
  );

  // Check if dismissal has expired
  const isProfileDismissalExpired = useMemo(() => {
    if (!profileDismissal.dismissed) return true;
    const elapsed = Date.now() - profileDismissal.timestamp;
    return elapsed > NOTIFICATION_CONFIG.DISMISSAL_DURATION;
  }, [profileDismissal]);

  // Dev-only URL override for testing
  const forceShow = useMemo(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('showProfileBanner') === '1';
    }
    return false;
  }, []);

  // Fail-safe timeout: show banner if loading takes too long for a creator
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (onboardingLoading && profile?.account_type === 'creator') {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
        if (import.meta.env.DEV) {
          console.log('[useNotificationRegistry] ⚠️ Loading timeout reached, showing banner as fail-safe');
        }
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [onboardingLoading, profile?.account_type]);

  // Determine if profile completion banner should be visible
  const isProfileCompletionVisible = useMemo(() => {
    if (import.meta.env.DEV) {
      console.log('[useNotificationRegistry] Evaluating profile completion visibility:', {
        onboardingLoading,
        hasProfile: !!profile,
        hasOnboardingState: !!onboardingState,
        accountType: profile?.account_type,
        percentComplete: onboardingState?.percentComplete,
        onboardingSkipped: onboardingState?.onboardingSkipped,
        searchUnlocked: onboardingState?.searchUnlocked,
        dismissed: profileDismissal.dismissed,
        dismissalExpired: isProfileDismissalExpired,
        forceShow,
        loadingTimeout,
      });
    }

    // Dev override
    if (forceShow) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] 🔧 Force show enabled via URL');
      return true;
    }

    // Must have profile
    if (!profile) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] No profile');
      return false;
    }

    // Only for creators
    if (profile.account_type !== 'creator') {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Not a creator account');
      return false;
    }

    // Check dismissal (even if loading)
    if (profileDismissal.dismissed && !isProfileDismissalExpired) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Banner dismissed and not expired');
      return false;
    }

    // Fail-safe: show if loading for too long
    if (loadingTimeout) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] ⚠️ Showing due to loading timeout');
      return true;
    }

    // Wait for onboarding state to load
    if (onboardingLoading || !onboardingState) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Still loading onboarding state');
      return false;
    }

    // Show if profile is incomplete (less than 100%)
    const isIncomplete = onboardingState.percentComplete < 100;
    if (import.meta.env.DEV) {
      console.log(`[useNotificationRegistry] Profile completion: ${onboardingState.percentComplete}%, incomplete: ${isIncomplete}`);
    }

    if (isIncomplete) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] ✅ Banner should be visible (incomplete profile)');
      return true;
    }

    if (import.meta.env.DEV) console.log('[useNotificationRegistry] Profile is complete, hiding banner');
    return false;
  }, [profile, onboardingState, onboardingLoading, profileDismissal, isProfileDismissalExpired, forceShow, loadingTimeout]);

  if (import.meta.env.DEV) {
    console.log('[useNotificationRegistry] Final visibility decision:', isProfileCompletionVisible);
  }

  // Handle profile completion dismissal
  const dismissProfileCompletion = () => {
    setProfileDismissal({ dismissed: true, timestamp: Date.now() });
  };

  // Registry of all possible notifications
  const notifications = useMemo<NotificationRegistryItem[]>(() => {
    const items: NotificationRegistryItem[] = [];

    // Profile Completion Banner
    if (isProfileCompletionVisible && onboardingState) {
      items.push({
        id: 'profile-completion',
        component: (
          <ProfileCompletionBanner 
            percentComplete={onboardingState.percentComplete || 0}
            onDismiss={dismissProfileCompletion} 
          />
        ),
        isVisible: true,
      });
    }

    // Future notifications can be added here:
    // if (isNewFeatureVisible) {
    //   items.push({
    //     id: 'new-feature',
    //     component: <NewFeatureBanner onDismiss={dismissNewFeature} />,
    //     isVisible: true,
    //   });
    // }

    if (import.meta.env.DEV) {
      console.log('[useNotificationRegistry] Built notifications array, count:', items.length);
    }

    return items;
  }, [isProfileCompletionVisible, onboardingState]);

  return {
    visibleNotifications: notifications,
    hasAnyVisible: notifications.length > 0,
  };
}
