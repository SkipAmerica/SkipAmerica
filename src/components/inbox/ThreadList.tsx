import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useInboxStore, InboxTab } from '@/stores/inbox-store';
import { ThreadRow } from './ThreadRow';
import { EmptyState } from './EmptyState';
import { Loader2 } from 'lucide-react';

interface Thread {
  id: string;
  type: string;
  creator_id: string;
  user_id: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count_creator: number;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  offer?: {
    amount_cents: number;
    currency: string;
    duration_minutes: number;
    status: string;
  };
}

interface ThreadListProps {
  tab: InboxTab;
}

export function ThreadList({ tab }: ThreadListProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { searchQuery, selectedTags, getScrollPosition } = useInboxStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position when tab changes
  useEffect(() => {
    if (containerRef.current) {
      const savedPosition = getScrollPosition(tab);
      containerRef.current.scrollTop = savedPosition;
    }
  }, [tab, getScrollPosition]);

  // Fetch threads for current tab
  useEffect(() => {
    if (!profile?.id) return;

    const fetchThreads = async () => {
      setIsLoading(true);
      
      let query = supabase
        .from('threads')
        .select(`
          id,
          type,
          creator_id,
          user_id,
          last_message_at,
          last_message_preview,
          unread_count_creator,
          user:profiles!threads_user_id_fkey(id, full_name, avatar_url),
          offer:offers(amount_cents, currency, duration_minutes, status)
        `)
        .eq('creator_id', profile.id)
        .eq('is_archived_creator', false)
        .order('last_message_at', { ascending: false });

      // Filter by tab type
      if (tab === 'offers') {
        query = query.eq('type', 'offer');
      } else if (tab === 'priority') {
        query = query.eq('type', 'priority');
      } else if (tab === 'standard') {
        query = query.eq('type', 'standard');
      } else if (tab === 'requests') {
        query = query.eq('type', 'request');
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`last_message_preview.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setThreads(data as Thread[]);
      }
      
      setIsLoading(false);
    };

    fetchThreads();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`threads-${tab}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: `creator_id=eq.${profile.id}`,
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, tab, searchQuery, selectedTags]);

  const handleThreadClick = (threadId: string) => {
    navigate(`/inbox/thread/${threadId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (threads.length === 0) {
    return <EmptyState tab={tab} />;
  }

  return (
    <div
      id="thread-list-container"
      ref={containerRef}
      className="h-full overflow-y-auto p-4 space-y-3"
    >
      {threads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          onClick={() => handleThreadClick(thread.id)}
        />
      ))}
    </div>
  );
}
