import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/auth-provider';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  hasStory: boolean;
  category: string;
  isFollowed?: boolean;
  hasInteracted?: boolean;
  matchesInterests?: boolean;
}

interface OnlineCreatorStoriesProps {
  onCreatorSelect?: (creatorId: string) => void;
  className?: string;
}

export function OnlineCreatorStories({ onCreatorSelect, className }: OnlineCreatorStoriesProps) {
  const [onlineCreators, setOnlineCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const loadCreators = async () => {
      setLoading(true);
      try {
        console.log('[OnlineCreatorStories] Loading real creators with presence tracking');

        // Get all creators from presence table (temporarily not filtering by online status)
        const { data: presenceData, error: presenceError } = await supabase
          .from('creator_presence')
          .select('creator_id')
          .limit(15);

        if (presenceError) {
          console.error('Error fetching presence:', presenceError);
          setOnlineCreators([]);
          setLoading(false);
          return;
        }

        if (!presenceData || presenceData.length === 0) {
          console.log('[OnlineCreatorStories] No online creators found');
          setOnlineCreators([]);
          setLoading(false);
          return;
        }

        const onlineIds = presenceData.map(p => p.creator_id);

        // Then query creators with those IDs - limited to 10
        const { data: onlineCreatorsData, error } = await supabase
          .from('creators')
          .select('id, full_name, avatar_url, categories')
          .in('id', onlineIds)
          .eq('is_suppressed', false)
          .limit(10);

        if (error) {
          console.error('Error fetching online creators:', error);
          setOnlineCreators([]);
          setLoading(false);
          return;
        }

        if (!onlineCreatorsData || onlineCreatorsData.length === 0) {
          console.log('[OnlineCreatorStories] No online creators found');
          setOnlineCreators([]);
          return;
        }

        const creators: Creator[] = onlineCreatorsData.map((creator: any) => ({
          id: creator.id,
          name: creator.full_name,
          username: `@${String(creator.full_name || '').toLowerCase().replace(/\s+/g, '')}`,
          avatar: creator.avatar_url || '',
          isOnline: true, // Already filtered by is_online = true
          hasStory: false, // Will implement stories later
          category: creator.categories?.[0] || 'General',
          isFollowed: false, // TODO: Check user follows when we add that feature
          hasInteracted: false, // TODO: Track interactions
          matchesInterests: false,
        }));

        setOnlineCreators(creators);
        console.log('[OnlineCreatorStories] Loaded', creators.length, 'online creators');
      } catch (error) {
        console.error('Error in OnlineCreatorStories load:', error);
        setOnlineCreators([]);
      } finally {
        setLoading(false);
      }
    };

    const debouncedLoad = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadCreators, 500);
    };

    loadCreators();

    // Subscribe to real-time presence updates with debounce
    const presenceChannel = supabase
      .channel('creator-presence-stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creator_presence',
        },
        () => {
          console.log('[OnlineCreatorStories] Presence changed, reloading');
          debouncedLoad();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const renderSkeletons = (count = 8) => (
    Array.from({ length: count }).map((_, i) => (
      <div key={`story-skel-${i}`} className="flex-shrink-0">
        <div className="p-0.5 rounded-full bg-gradient-to-r from-primary via-primary/80 to-accent/80">
          <Skeleton className="h-16 w-16 rounded-full ring-2 ring-background" />
        </div>
        <div className="text-xs text-center mt-1 w-16 truncate">
          <Skeleton className="h-3 w-12 mx-auto rounded-full" />
        </div>
      </div>
    ))
  );

  return (
    <div className={cn("flex-1 ml-4 w-full", className)}>
      <div className="ios-horizontal-scroll flex w-full items-center space-x-3 overflow-x-auto overflow-y-visible scrollbar-hide pb-1 flex-nowrap">
        {loading || onlineCreators.length === 0 ? (
          renderSkeletons(8)
        ) : (
          onlineCreators.map((creator) => (
            <div
              key={creator.id}
              className="flex-shrink-0 cursor-pointer ios-story-item"
              onClick={() => {
                if (creator.id) {
                  window.location.href = `/join-queue/${creator.id}`;
                }
              }}
            >
              <div className="relative p-[9px]">
                {/* Outer container for all rings - increased by 30% to 87px */}
                <div className="relative h-[87px] w-[87px]">
                  {/* Avatar - increased by 30% to 87px */}
                  <Avatar className="h-[87px] w-[87px] absolute inset-0">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="text-sm font-medium">
                      {creator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* White stroke #1 - OUTER stroke of the profile pic (overlays image edge) */}
                  <div className="absolute inset-0 rounded-full ring-[3px] ring-white pointer-events-none" />
                  
                  {/* Turquoise stroke #2 - Outside the white stroke */}
                  <div className="absolute -inset-[3px] rounded-full ring-[3px] ring-turquoise pointer-events-none" />
                  
                  {/* Cyan ring #3 - Only for online creators, no pulse */}
                  {creator.isOnline && (
                    <div 
                      className="absolute -inset-[3px] rounded-full ring-[3px] ring-[#00C2D8] pointer-events-none"
                    />
                  )}
                </div>
              </div>
              
              {/* Creator name - truncated for mobile */}
              <div className="text-xs text-center mt-1 w-20 truncate">
                {creator.name.split(' ')[0]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
