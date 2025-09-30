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
    const loadCreators = async () => {
      setLoading(true);
      try {
        console.log('[OnlineCreatorStories] Loading real creators with presence tracking');

        // Query real creators with online status from creator_presence
        const { data: onlineCreatorsData, error } = await supabase
          .from('creators')
          .select(`
            id,
            full_name,
            avatar_url,
            categories,
            creator_presence!inner (
              is_online
            )
          `)
          .eq('creator_presence.is_online', true)
          .eq('is_suppressed', false)
          .limit(20);

        if (error) {
          console.error('Error fetching online creators:', error);
          setOnlineCreators([]);
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

    loadCreators();

    // Subscribe to real-time presence updates
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
          loadCreators();
        }
      )
      .subscribe();

    return () => {
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
              onClick={() => onCreatorSelect?.(creator.id)}
            >
              <div className="relative">
                {/* Story indicator ring or gradient ring */}
                <div className={cn(
                  "p-0.5 rounded-full",
                  creator.isOnline && creator.hasStory
                    ? "ring-2 ring-green-500 animate-pulse"
                    : "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"
                )}>
                  <Avatar className="h-16 w-16 ring-2 ring-background">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="text-sm font-medium">
                      {creator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Online indicator */}
                {creator.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[hsl(var(--online))] border-2 border-background flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-[hsl(var(--background))] animate-pulse" />
                  </div>
                )}
              </div>
              
              {/* Creator name - truncated for mobile */}
              <div className="text-xs text-center mt-1 w-16 truncate">
                {creator.name.split(' ')[0]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
