import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { OnlineCreatorStories } from './OnlineCreatorStories';
import { RUNTIME } from '@/config/runtime';

interface Profile {
  avatar_url?: string;
  full_name?: string;
  account_type?: string;
}

interface User {
  email?: string;
}

interface IOSHeaderBottomRowProps {
  onCreatorSelect?: (creatorId: string) => void;
  profile?: Profile;
  user?: User;
}

export const IOSHeaderBottomRow = React.memo(function IOSHeaderBottomRow({
  profile,
  user,
  onCreatorSelect,
}: IOSHeaderBottomRowProps) {
  const handleRecordVideo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.setAttribute('capture', 'user');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (RUNTIME.DEBUG_LOGS) {
          console.error('Recording selected for story:', file);
        }
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
        if (RUNTIME.DEBUG_LOGS) {
          console.error('File selected for story upload:', file);
        }
      }
    };
    input.click();
  };

  return (
    <div className="z-20 w-full bg-white px-4">
      <div className="flex items-center pb-1.5 pt-2">
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
});
