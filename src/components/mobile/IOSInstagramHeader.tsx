import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/app/providers/auth-provider';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MessageCircle, Heart, Menu, Phone } from 'lucide-react';
import { OnlineCreatorStories } from './OnlineCreatorStories';
import { useKeyboardAware } from '@/hooks/use-keyboard-aware';

interface IOSInstagramHeaderProps {
  transparent?: boolean;
  className?: string;
  onMenuClick?: () => void;
  onCreatorSelect?: (creatorId: string) => void;
}

export function IOSInstagramHeader({ 
  transparent = false,
  className,
  onMenuClick,
  onCreatorSelect
}: IOSInstagramHeaderProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isKeyboardVisible } = useKeyboardAware();

  const handleRecordVideo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.setAttribute('capture', 'user');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Recording selected for story:', file);
      }
    };
    input.click();
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('File selected for story upload:', file);
      }
    };
    input.click();
  };

  return (
    <div 
      id="ig-header" 
      className={cn(
        "z-60 w-full overflow-x-hidden overflow-y-visible",
        "flex flex-col",
        "px-4 pt-safe-top pb-0",
        isKeyboardVisible ? "fixed" : "sticky top-0",
        !transparent && "bg-turquoise-light/15 backdrop-blur-md",
        className
      )}
      style={{ 
        top: isKeyboardVisible ? 'var(--debug-safe-top)' : undefined,
        transform: 'translateZ(0)',
        willChange: isKeyboardVisible ? 'transform, top' : 'transform',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* Top Row - Skip Logo */}
      <div className="flex items-center justify-between h-11 mb-2">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-turquoise-dark">Skip</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="ios-touchable h-11 px-2">
            <Heart size={24} />
          </Button>
          <Button variant="ghost" size="sm" className="ios-touchable h-11 px-2 relative">
            <Phone size={24} />
            {/* Badge for pending callers - you can add logic here */}
            <div className="absolute top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
              3
            </div>
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

      {/* Bottom Row - User Profile + Online Creator Stories */}
      <div className="flex items-center pb-1.5">
        <div className="relative flex-shrink-0 flex flex-col items-center">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || 'Profile'} />
            <AvatarFallback className="text-sm font-medium">
              {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 
               user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="text-xs text-primary font-medium mt-1 hover:text-primary/80 transition-colors"
              >
                What's new
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="min-w-[200px]">
              <DropdownMenuItem onClick={handleRecordVideo}>
                Record video story
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUpload}>
                Upload photo or video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Online Creator Stories */}
        <OnlineCreatorStories onCreatorSelect={onCreatorSelect} />
      </div>
    </div>
  );
}