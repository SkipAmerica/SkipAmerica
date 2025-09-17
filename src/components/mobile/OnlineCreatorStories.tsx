import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    // Mock data for creators - in real app this would come from API
    const mockCreators: Creator[] = [
      {
        id: "1",
        name: "Emma Stone",
        username: "@emmastone",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150",
        isOnline: true,
        hasStory: true,
        category: "Entertainment",
        isFollowed: true,
        hasInteracted: true
      },
      {
        id: "2", 
        name: "Dr. Sarah Chen",
        username: "@drsarahchen",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        isOnline: true,
        hasStory: false,
        category: "Technology",
        matchesInterests: true
      },
      {
        id: "3",
        name: "Marcus Johnson",
        username: "@marcusfit",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        isOnline: true,
        hasStory: true,
        category: "Fitness",
        isFollowed: true
      },
      {
        id: "4",
        name: "Lisa Rodriguez",
        username: "@lisa_creates",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        isOnline: false,
        hasStory: true,
        category: "Business",
        isFollowed: true
      },
      {
        id: "5",
        name: "Alex Turner",
        username: "@alexmusic",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        isOnline: false,
        hasStory: false,
        category: "Music",
        isFollowed: true
      },
      {
        id: "6",
        name: "Maya Patel",
        username: "@mayacooks",
        avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150",
        isOnline: true,
        hasStory: false,
        category: "Cooking"
      }
    ];

    // Sort creators based on priority:
    // 1. Online with stories (pulsing green)
    // 2. Online without stories
    // 3. Offline with stories
    // 4. Offline without stories
    const sortedCreators = mockCreators.sort((a, b) => {
      // Priority scoring
      const getScore = (creator: Creator) => {
        let score = 0;
        if (creator.isOnline && creator.hasStory) score = 1000;
        else if (creator.isOnline && !creator.hasStory) score = 900;
        else if (!creator.isOnline && creator.hasStory) score = 800;
        else score = 700;
        
        // Boost for followed/interacted/interests
        if (creator.isFollowed) score += 100;
        if (creator.hasInteracted) score += 50;
        if (creator.matchesInterests) score += 25;
        
        return score;
      };
      
      return getScore(b) - getScore(a);
    });

    setOnlineCreators(sortedCreators);
  }, []);

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