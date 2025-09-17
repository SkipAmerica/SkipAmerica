import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isLive: boolean;
  category: string;
}

interface OnlineCreatorStoriesProps {
  onCreatorSelect?: (creatorId: string) => void;
  className?: string;
}

export function OnlineCreatorStories({ onCreatorSelect, className }: OnlineCreatorStoriesProps) {
  const [onlineCreators, setOnlineCreators] = useState<Creator[]>([]);

  useEffect(() => {
    // Mock data for online creators - in real app this would come from API
    const mockOnlineCreators: Creator[] = [
      {
        id: "1",
        name: "Emma Stone",
        username: "@emmastone",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150",
        isLive: true,
        category: "Entertainment"
      },
      {
        id: "2", 
        name: "Dr. Sarah Chen",
        username: "@drsarahchen",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        isLive: true,
        category: "Technology"
      },
      {
        id: "3",
        name: "Marcus Johnson",
        username: "@marcusfit",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        isLive: true,
        category: "Fitness"
      },
      {
        id: "4",
        name: "Lisa Rodriguez",
        username: "@lisa_creates",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        isLive: true,
        category: "Business"
      },
      {
        id: "5",
        name: "Alex Turner",
        username: "@alexmusic",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        isLive: true,
        category: "Music"
      },
      {
        id: "6",
        name: "Maya Patel",
        username: "@mayacooks",
        avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150",
        isLive: true,
        category: "Cooking"
      }
    ];

    setOnlineCreators(mockOnlineCreators);
  }, []);

  if (onlineCreators.length === 0) return null;

  return (
    <div className={cn("flex-1 ml-4", className)}>
      <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide pb-1">
        {onlineCreators.map((creator) => (
          <div
            key={creator.id}
            className="flex-shrink-0 cursor-pointer ios-story-item"
            onClick={() => onCreatorSelect?.(creator.id)}
          >
            <div className="relative">
              <div className="p-0.5 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
                <Avatar className="h-12 w-12 ring-2 ring-background">
                  <AvatarImage src={creator.avatar} alt={creator.name} />
                  <AvatarFallback className="text-xs font-medium">
                    {creator.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Live indicator */}
              {creator.isLive && (
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                </div>
              )}
            </div>
            
            {/* Creator name - truncated for mobile */}
            <div className="text-xs text-center mt-1 w-12 truncate">
              {creator.name.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}