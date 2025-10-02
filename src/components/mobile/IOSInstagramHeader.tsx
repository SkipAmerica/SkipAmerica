import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/app/providers/auth-provider';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Mail, Heart, Menu, Phone, Users } from 'lucide-react';
import { OnlineCreatorStories } from './OnlineCreatorStories';
import { useKeyboardAware } from '@/hooks/use-keyboard-aware';
import { RUNTIME } from '@/config/runtime';
import { useLive } from '@/hooks/live';
import { QueueDrawer } from '@/components/live/QueueDrawer';
import { supabase } from '@/integrations/supabase/client';

interface IOSInstagramHeaderProps {
  transparent?: boolean;
  className?: string;
  onMenuClick?: () => void;
  onCreatorSelect?: (creatorId: string) => void;
}

export const IOSInstagramHeader = React.memo(function IOSInstagramHeader({ 
  transparent = false,
  className,
  onMenuClick,
  onCreatorSelect
}: IOSInstagramHeaderProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { isKeyboardVisible } = useKeyboardAware();
  const { queueCount } = useLive();
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [, forceUpdate] = useState({});
  const [inboxCounts, setInboxCounts] = useState({
    standard_unread: 0,
    priority_unread: 0,
    offers_new: 0,
    requests_unread: 0,
  });

  const headerRef = useRef<HTMLDivElement>(null);

  // Fetch inbox counts for creators
  useEffect(() => {
    if (!profile?.id || profile.account_type !== 'creator') return;

    const fetchCounts = async () => {
      const { data } = await supabase
        .rpc('creator_inbox_counts', { p_creator_id: profile.id });
      
      if (data && data[0]) {
        setInboxCounts(data[0]);
      }
    };

    fetchCounts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('header-inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: `creator_id=eq.${profile.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.account_type]);

  // Listen for queue count updates to trigger re-render
  useEffect(() => {
    const handleQueueUpdate = () => {
      forceUpdate({});
    };

    window.addEventListener('queue-count-updated', handleQueueUpdate);
    return () => window.removeEventListener('queue-count-updated', handleQueueUpdate);
  }, []);

  const handleQueueClick = () => {
    if (queueCount > 0) {
      setShowQueueDrawer(true);
    }
  };

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
    <div 
      id="ig-header" ref={headerRef} 
      className={cn(
        "z-20 w-full overflow-x-hidden overflow-y-visible",
        "flex flex-col",
        "px-4 pb-0",
        "sticky top-0 ios-safe-top",
        !transparent && "bg-turquoise-extra-light",
        className
      )}
    >
      {/* Top Row - Skip Logo */}
      <div className="flex items-center justify-between h-[52px] mb-2">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-turquoise-dark">Skip</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost"
            className="ios-touchable h-[52px] w-[52px] p-0 relative [&_svg]:!w-[28px] [&_svg]:!h-[28px]"
            onClick={handleQueueClick}
            disabled={queueCount === 0}
          >
            <Users size={28} />
            {queueCount > 0 && (
              <div className="absolute top-1 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {queueCount}
              </div>
            )}
          </Button>
          <Button variant="ghost" className="ios-touchable h-[52px] w-[52px] p-0 [&_svg]:!w-[28px] [&_svg]:!h-[28px]">
            <Heart size={28} />
          </Button>
          <Button variant="ghost" className="ios-touchable h-[52px] w-[52px] p-0 relative [&_svg]:!w-[28px] [&_svg]:!h-[28px]">
            <Phone size={28} />
            {/* Badge for pending callers - you can add logic here */}
            <div className="absolute top-1 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              3
            </div>
          </Button>
          {/* Mail Icon with Badges - Only for creators */}
          {profile?.account_type === 'creator' && (
            <Button 
              variant="ghost"
              className="ios-touchable h-[52px] w-[52px] p-0 relative [&_svg]:!w-[28px] [&_svg]:!h-[28px]"
              onClick={() => navigate('/inbox')}
            >
              <Mail size={28} />
              
              {/* Red badge for standard unread count */}
              {inboxCounts.standard_unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-xs leading-6 text-center text-white font-medium">
                  {inboxCounts.standard_unread}
                </span>
              )}
              
              {/* Green badge for priority/offers - same size, positioned below */}
              {(inboxCounts.priority_unread > 0 || inboxCounts.offers_new > 0) && (
                <span className="absolute top-3 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-turquoise-extra-light"></span>
              )}
            </Button>
          )}
          <Button 
            variant="ghost"
            className="ios-touchable h-[52px] w-[52px] p-0 [&_svg]:!w-[28px] [&_svg]:!h-[28px]"
            onClick={onMenuClick}
          >
            <Menu size={28} />
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

      {/* Queue Drawer */}
      <QueueDrawer 
        isOpen={showQueueDrawer} 
        onClose={() => setShowQueueDrawer(false)} 
      />
    </div>
  );
});