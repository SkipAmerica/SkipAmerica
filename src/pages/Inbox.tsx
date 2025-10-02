import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInboxStore, InboxTab } from '@/stores/inbox-store';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { InboxTabs } from '@/components/inbox/InboxTabs';
import { InboxSearch } from '@/components/inbox/InboxSearch';
import { ThreadList } from '@/components/inbox/ThreadList';

export default function Inbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useProfile();
  
  const { 
    setCounts, 
    setActiveTab, 
    setSearchQuery, 
    activeTab,
    clearTags 
  } = useInboxStore();

  // Sync URL params to store on mount
  useEffect(() => {
    const tab = searchParams.get('tab') as InboxTab || 'standard';
    const query = searchParams.get('q') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    
    setActiveTab(tab);
    setSearchQuery(query);
    clearTags();
    tags.forEach(tag => useInboxStore.getState().addTag(tag));
  }, [searchParams, setActiveTab, setSearchQuery, clearTags]);

  // Fetch inbox counts
  useEffect(() => {
    if (!profile?.id) return;

    const fetchCounts = async () => {
      const { data, error } = await supabase
        .rpc('creator_inbox_counts', { p_creator_id: profile.id });
      
      if (data && !error) {
        setCounts(data[0] || {
          standard_unread: 0,
          priority_unread: 0,
          offers_new: 0,
          requests_unread: 0,
        });
      }
    };

    fetchCounts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: `creator_id=eq.${profile.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `creator_id=eq.${profile.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, setCounts]);

  // Redirect non-creators
  useEffect(() => {
    if (profile && profile.account_type !== 'creator') {
      navigate('/');
    }
  }, [profile, navigate]);

  if (!profile || profile.account_type !== 'creator') {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Glass container */}
      <div className="h-screen flex flex-col">
        {/* Inbox Tabs */}
        <InboxTabs />

        {/* Search & Filters */}
        <InboxSearch />

        {/* Thread List */}
        <div className="flex-1 overflow-hidden">
          <ThreadList tab={activeTab} />
        </div>
      </div>
    </div>
  );
}
