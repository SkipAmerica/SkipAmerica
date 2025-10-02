import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInboxStore, InboxTab } from '@/stores/inbox-store';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/app/providers/auth-provider';
import { InboxTabs } from '@/components/inbox/InboxTabs';
import { InboxSearch } from '@/components/inbox/InboxSearch';
import { ThreadList } from '@/components/inbox/ThreadList';
import { IOSTabBar } from '@/components/mobile/IOSTabBar';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLive } from '@/hooks/live';
import DiscoverabilityModal from '@/components/DiscoverabilityModal';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Inbox() {
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useProfile();
  const { user } = useAuth();
  
  const { 
    setCounts, 
    setActiveTab, 
    setSearchQuery, 
    activeTab,
    clearTags 
  } = useInboxStore();

  const { 
    isLive, 
    isDiscoverable, 
    toggleDiscoverable, 
    isTransitioning,
    showDiscoverabilityModal,
    setDiscoverabilityModal 
  } = useLive();

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
    <div className="h-screen w-full bg-background flex flex-col">
      {/* Custom Instagram-style Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 -ml-2 bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <ChevronLeft className="h-7 w-7" />
            <span className="text-xl font-bold">Inbox</span>
          </Button>
        </div>
      </div>

      {/* Dev Seeding Button */}
      {import.meta.env.DEV && (
        <div className="fixed top-14 left-0 right-0 z-40 p-4 border-b border-border bg-background flex justify-end safe-top">
          <button
            onClick={async () => {
              if (isSeeding || !profile?.id) return;
              
              setIsSeeding(true);
              try {
                const { data, error } = await supabase.functions.invoke('seed-inbox', {
                  body: { creatorId: profile.id },
                });

                if (error) throw error;

                toast.success(`Inbox seeded: ${data.data.threads_created} threads created`);
                
                // Refresh inbox counts
                const { data: counts } = await supabase.rpc('creator_inbox_counts', {
                  p_creator_id: profile.id,
                });
                if (counts) {
                  setCounts(counts[0] || {
                    standard_unread: 0,
                    priority_unread: 0,
                    offers_new: 0,
                    requests_unread: 0,
                  });
                }
              } catch (error) {
                console.error('Error seeding inbox:', error);
                toast.error('Failed to seed inbox data');
              } finally {
                setIsSeeding(false);
              }
            }}
            disabled={isSeeding}
            className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg text-sm text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? 'Seeding...' : 'Seed Inbox Data'}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingTop: import.meta.env.DEV ? '120px' : '56px', paddingBottom: 'var(--ios-tab-bar-height, 80px)' }}>
        {/* Search & Filters */}
        <InboxSearch />

        {/* Inbox Tabs */}
        <InboxTabs />

        {/* Thread List */}
        <div className="flex-1 overflow-hidden">
          <ThreadList tab={activeTab} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <IOSTabBar
        activeTab="following"
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'browse') navigate('/?tab=browse');
          else if (tab === 'following') navigate('/?tab=following');
          else if (tab === 'profile') navigate('/profile');
        }}
        showFollowing={true}
        isCreator={profile?.account_type === 'creator'}
        isLive={isLive}
        isDiscoverable={isDiscoverable}
        onToggleDiscoverable={toggleDiscoverable}
        isTransitioning={isTransitioning}
      />
      
      <DiscoverabilityModal 
        open={showDiscoverabilityModal} 
        onClose={() => setDiscoverabilityModal(false)} 
      />
    </div>
  );
}
