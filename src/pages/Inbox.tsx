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
    <div className="min-h-screen w-full bg-gradient-to-br from-white to-gray-50">
      {/* Main container */}
      <div className="h-screen flex flex-col">
        {/* Header with Dev Seeding */}
        {import.meta.env.DEV && (
          <div className="p-4 border-b border-gray-200 flex justify-end">
            <button
              onClick={async () => {
                const { supabase } = await import('@/integrations/supabase/client');
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Create sample fan profiles  
                const fan1 = await supabase.from('profiles').insert({
                  id: crypto.randomUUID(),
                  full_name: 'Sarah Johnson',
                  account_type: 'fan' as const
                } as any).select().single();
                
                const fan2 = await supabase.from('profiles').insert({
                  id: crypto.randomUUID(),
                  full_name: 'Mike Davis',
                  account_type: 'fan' as const
                } as any).select().single();

                if (!fan1.data || !fan2.data) return;

                // Offer threads
                await supabase.from('offers').insert([
                  {
                    creator_id: user.id,
                    user_id: fan1.data.id,
                    amount_cents: 20000,
                    currency: 'USD',
                    duration_minutes: 30,
                    status: 'pending',
                    note: 'Would love to discuss your latest project!'
                  }
                ]);

                // Priority threads
                await supabase.from('threads').insert([
                  {
                    creator_id: user.id,
                    user_id: fan2.data.id,
                    type: 'priority',
                    last_message_at: new Date().toISOString(),
                    last_message_preview: 'Thanks for taking the time to chat!',
                    unread_count_creator: 1
                  }
                ]);

                // Standard threads
                await supabase.from('threads').insert([
                  {
                    creator_id: user.id,
                    user_id: fan1.data.id,
                    type: 'standard',
                    last_message_at: new Date(Date.now() - 3600000).toISOString(),
                    last_message_preview: 'Looking forward to our next session',
                    unread_count_creator: 0
                  }
                ]);

                // Request threads
                await supabase.from('threads').insert([
                  {
                    creator_id: user.id,
                    user_id: fan2.data.id,
                    type: 'request',
                    last_message_at: new Date(Date.now() - 7200000).toISOString(),
                    last_message_preview: 'Hi! Would love to connect with you',
                    unread_count_creator: 1
                  }
                ]);

                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm text-gray-900 transition-colors"
            >
              Seed Inbox Data
            </button>
          </div>
        )}

        {/* Search & Filters */}
        <InboxSearch />

        {/* Inbox Tabs */}
        <InboxTabs />

        {/* Thread List */}
        <div className="flex-1 overflow-hidden">
          <ThreadList tab={activeTab} />
        </div>
      </div>
    </div>
  );
}
