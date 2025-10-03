import { ReactNode, useMemo } from 'react';
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

  // Determine if profile completion banner should be visible
  const isProfileCompletionVisible = useMemo(() => {
    if (import.meta.env.DEV) {
      console.log('[useNotificationRegistry] Evaluating profile completion visibility:', {
        onboardingLoading,
        hasProfile: !!profile,
        hasOnboardingState: !!onboardingState,
        accountType: profile?.account_type,
        searchUnlocked: onboardingState?.searchUnlocked,
        dismissed: profileDismissal.dismissed,
        dismissalExpired: isProfileDismissalExpired,
      });
    }

    if (onboardingLoading || !profile || !onboardingState) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Missing required data');
      return false;
    }
    if (profile.account_type !== 'creator') {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Not a creator account');
      return false;
    }
    if (onboardingState.searchUnlocked) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Search already unlocked');
      return false;
    }
    if (profileDismissal.dismissed && !isProfileDismissalExpired) {
      if (import.meta.env.DEV) console.log('[useNotificationRegistry] Banner dismissed and not expired');
      return false;
    }
    
    if (import.meta.env.DEV) console.log('[useNotificationRegistry] ✅ Banner should be visible');
    return true;
  }, [profile, onboardingState, onboardingLoading, profileDismissal, isProfileDismissalExpired]);

  // Handle profile completion dismissal
  const dismissProfileCompletion = () => {
    setProfileDismissal({ dismissed: true, timestamp: Date.now() });
  };

  // Registry of all possible notifications
  const notifications = useMemo<NotificationRegistryItem[]>(() => {
    const items: NotificationRegistryItem[] = [];

    // Profile Completion Banner
    if (isProfileCompletionVisible) {
      items.push({
        id: 'profile-completion',
        component: <ProfileCompletionBanner onDismiss={dismissProfileCompletion} />,
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

    return items;
  }, [isProfileCompletionVisible]);

  return {
    visibleNotifications: notifications,
    hasAnyVisible: notifications.length > 0,
  };
}
