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
        let creators: Creator[] = [];

        // Try followed creators first if signed in
        if (user?.email) {
          const { data: followedCreators, error } = await supabase
            .from('mock_user_follows')
            .select(`
              following_creator_id,
              mock_creators!inner (
                id,
                full_name,
                avatar_url,
                category,
                is_online,
                bio
              )
            `)
            .eq('follower_email', user.email);

          if (error) {
            console.error('Error fetching followed creators:', error);
          }

          if (followedCreators) {
            creators = followedCreators.map((follow: any) => {
              const creator = follow.mock_creators;
              return {
                id: creator.id,
                name: creator.full_name,
                username: `@${String(creator.full_name || '').toLowerCase().replace(/\s+/g, '')}`,
                avatar: creator.avatar_url,
                isOnline: !!creator.is_online,
                hasStory: Math.random() > 0.6, // Demo
                category: creator.category,
                isFollowed: true,
                hasInteracted: Math.random() > 0.7,
              } as Creator;
            });
          }
        }

        // Fallback: trending online creators (works even if signed out)
        if (creators.length === 0) {
          const { data: trending, error: trendingError } = await supabase
            .from('mock_creators')
            .select('id, full_name, avatar_url, category, is_online')
            .eq('is_online', true)
            .limit(20);

          if (trendingError) {
            console.error('Error fetching trending creators:', trendingError);
          }

          if (trending) {
            creators = trending.map((creator: any) => ({
              id: creator.id,
              name: creator.full_name,
              username: `@${String(creator.full_name || '').toLowerCase().replace(/\s+/g, '')}`,
              avatar: creator.avatar_url,
              isOnline: !!creator.is_online,
              hasStory: Math.random() > 0.6,
              category: creator.category,
              isFollowed: false,
              hasInteracted: false,
            }));
          }
        }

        // Sort by online + story + interactions
        const sortedCreators = creators.sort((a, b) => {
          const score = (c: Creator) => {
            let s = 0;
            if (c.isOnline && c.hasStory) s = 1000;
            else if (c.isOnline) s = 900;
            else if (c.hasStory) s = 800;
            else s = 700;
            if (c.hasInteracted) s += 50;
            return s;
          };
          return score(b) - score(a);
        });

        setOnlineCreators(sortedCreators);
      } catch (error) {
        console.error('Error in OnlineCreatorStories load:', error);
        setOnlineCreators([]);
      } finally {
        setLoading(false);
      }
    };

    loadCreators();
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
