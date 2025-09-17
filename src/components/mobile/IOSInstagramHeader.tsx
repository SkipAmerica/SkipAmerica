import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { MessageCircle, Heart, Menu } from 'lucide-react';

interface IOSInstagramHeaderProps {
  transparent?: boolean;
  className?: string;
  onMenuClick?: () => void;
}

export function IOSInstagramHeader({ 
  transparent = false,
  className,
  onMenuClick
}: IOSInstagramHeaderProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-40",
      "flex flex-col",
      "px-4 pt-safe-area-top pb-2",
      !transparent && "bg-background/95 backdrop-blur-md border-b border-border/50",
      className
    )}>
      {/* Top Row - Skip Logo */}
      <div className="flex items-center justify-between h-11 mb-2">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight">Skip</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="ios-touchable h-11 px-2">
            <Heart size={24} />
          </Button>
          <Button variant="ghost" size="sm" className="ios-touchable h-11 px-2">
            <MessageCircle size={24} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ios-touchable h-11 px-2"
            onClick={onMenuClick}
          >
            <Menu size={24} />
          </Button>
        </div>
      </div>

      {/* Bottom Row - User Profile */}
      <div className="flex items-center">
        <div className="relative">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || 'Profile'} />
            <AvatarFallback className="text-sm font-medium">
              {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 
               user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}