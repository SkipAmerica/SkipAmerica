import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { useProfile } from '@/hooks/useProfile';
import { useLive } from '@/hooks/live';
import { QueueDrawer } from '@/components/live/QueueDrawer';
import { supabase } from '@/integrations/supabase/client';
import { IOSHeaderTopRow } from './IOSHeaderTopRow';
import { IOSHeaderBottomRow } from './IOSHeaderBottomRow';
import { FEATURES } from '@/config/features';

interface IOSInstagramHeaderProps {
  transparent?: boolean;
  className?: string;
  onMenuClick?: () => void;
  onCreatorSelect?: (creatorId: string) => void;
  hideBottomRow?: boolean;
}

export const IOSInstagramHeader = React.memo(function IOSInstagramHeader({ 
  onMenuClick,
  onCreatorSelect,
  hideBottomRow = false
}: IOSInstagramHeaderProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { queueCount } = useLive();
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [, forceUpdate] = useState({});
  const [inboxCounts, setInboxCounts] = useState({
    standard_unread: 0,
    priority_unread: 0,
    offers_new: 0,
    requests_unread: 0,
  });

  const showAdPanel = FEATURES.SHOW_AD_PANEL;

  // Fetch inbox counts for creators - optimized with staleTime and conditional execution
  useEffect(() => {
    if (!profile?.id || profile.account_type !== 'creator') return;

    let isMounted = true;

    const fetchCounts = async () => {
      const { data } = await supabase
        .rpc('creator_inbox_counts', { p_creator_id: profile.id });
      
      if (data && data[0] && isMounted) {
        setInboxCounts(data[0]);
      }
    };

    // Initial fetch with delay to deprioritize
    const timer = setTimeout(() => {
      fetchCounts();
    }, 300);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('header-inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: `creator_id=eq.${profile.id}`,
        },
        () => {
          if (isMounted) {
            fetchCounts();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.account_type]);

  // Listen for queue count updates to trigger re-render
  useEffect(() => {
    const handleQueueUpdate = () => {
      forceUpdate({});
    };

    window.addEventListener('queue-count-updated', handleQueueUpdate);
    return () => window.removeEventListener('queue-count-updated', handleQueueUpdate);
  }, []);

  const handleQueueClick = () => {
    if (queueCount > 0) {
      setShowQueueDrawer(true);
    }
  };

  return (
    <>
      {/* Row 1: Skip logo + icons - always sticky at top */}
      <IOSHeaderTopRow
        onMenuClick={onMenuClick}
        queueCount={queueCount}
        onQueueClick={handleQueueClick}
        inboxCounts={inboxCounts}
        accountType={profile?.account_type}
      />

      {/* Row 2: User avatar + OCS - conditionally sticky */}
      {!hideBottomRow && (
        <IOSHeaderBottomRow
          profile={profile}
          user={user}
          onCreatorSelect={onCreatorSelect}
          showAdPanel={showAdPanel}
        />
      )}

      {/* Queue Drawer */}
      <QueueDrawer 
        isOpen={showQueueDrawer} 
        onClose={() => setShowQueueDrawer(false)} 
      />
    </>
  );
});