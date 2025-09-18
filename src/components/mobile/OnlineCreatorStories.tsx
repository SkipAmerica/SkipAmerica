import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();

  useEffect(() => {
    const fetchFollowedCreators = async () => {
      if (!user?.email) return;

      try {
        // Get followed creators from mock_user_follows and mock_creators tables
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
          return;
        }

        // Transform data to match Creator interface
        const creators: Creator[] = followedCreators?.map(follow => {
          const creator = follow.mock_creators;
          return {
            id: creator.id,
            name: creator.full_name,
            username: `@${creator.full_name.toLowerCase().replace(' ', '')}`,
            avatar: creator.avatar_url,
            isOnline: creator.is_online,
            hasStory: Math.random() > 0.6, // Randomly assign stories for demo
            category: creator.category,
            isFollowed: true,
            hasInteracted: Math.random() > 0.7
          };
        }) || [];

        // Sort creators based on priority
        const sortedCreators = creators.sort((a, b) => {
          const getScore = (creator: Creator) => {
            let score = 0;
            if (creator.isOnline && creator.hasStory) score = 1000;
            else if (creator.isOnline && !creator.hasStory) score = 900;
            else if (!creator.isOnline && creator.hasStory) score = 800;
            else score = 700;
            
            if (creator.hasInteracted) score += 50;
            return score;
          };
          
          return getScore(b) - getScore(a);
        });

        setOnlineCreators(sortedCreators);
      } catch (error) {
        console.error('Error in fetchFollowedCreators:', error);
      }
    };

    fetchFollowedCreators();
  }, [user]);

  if (onlineCreators.length === 0) return null;

  return (
    <div className={cn("flex-1 ml-4 w-full", className)}>
      <div className="ios-horizontal-scroll flex w-full items-center space-x-3 overflow-x-auto overflow-y-hidden scrollbar-hide pb-1 flex-nowrap">
        {onlineCreators.map((creator) => (
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
        ))}
      </div>
    </div>
  );
}