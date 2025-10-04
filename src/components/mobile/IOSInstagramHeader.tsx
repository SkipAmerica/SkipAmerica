import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Mail, Menu, CalendarDays, Users } from 'lucide-react';
import { useLive } from '@/hooks/live';
import { QueueDrawer } from '@/components/live/QueueDrawer';
import { supabase } from '@/integrations/supabase/client';

interface IOSInstagramHeaderProps {
  transparent?: boolean;
  className?: string;
  onMenuClick?: () => void;
}

export const IOSInstagramHeader = React.memo(function IOSInstagramHeader({ 
  transparent = false,
  className,
  onMenuClick
}: IOSInstagramHeaderProps) {
  const { profile } = useProfile();
  const navigate = useNavigate();
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
      <div className="flex items-center justify-between h-[47px]">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-turquoise-dark">Skip</h1>
        </div>
        <div className="flex items-center space-x-[1.5px]">
          <Button 
            variant="ghost"
            className="ios-touchable h-[47px] w-[30px] p-0 relative [&_svg]:!w-[22px] [&_svg]:!h-[22px]"
            onClick={handleQueueClick}
            disabled={queueCount === 0}
          >
            <Users size={22} />
            {queueCount > 0 && (
              <div className="absolute top-1 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {queueCount}
              </div>
            )}
          </Button>
          <Button variant="ghost" className="ios-touchable h-[47px] w-[30px] p-0 relative [&_svg]:!w-[22px] [&_svg]:!h-[22px]">
            <CalendarDays size={22} />
            {/* Badge for pending callers - you can add logic here */}
            <div className="absolute top-1 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              3
            </div>
          </Button>
          {/* Mail Icon with Badges - Only for creators */}
          {profile?.account_type === 'creator' && (
            <Button 
              variant="ghost"
              className="ios-touchable h-[47px] w-[30px] p-0 relative [&_svg]:!w-[22px] [&_svg]:!h-[22px]"
              onClick={() => navigate('/inbox')}
            >
              <Mail size={22} />
              
              {/* Red badge for standard unread count */}
              {inboxCounts.standard_unread > 0 && (
                <span className="absolute top-1 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-xs text-center text-white font-medium flex items-center justify-center">
                  {inboxCounts.standard_unread}
                </span>
              )}
              
              {/* Green badge for priority/offers - same size, positioned below with $ */}
              {(inboxCounts.priority_unread > 0 || inboxCounts.offers_new > 0) && (
                <span className="absolute top-4 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-turquoise-extra-light flex items-center justify-center text-white text-[9px] font-bold">$</span>
              )}
            </Button>
          )}
          <Button 
            variant="ghost"
            className="ios-touchable h-[47px] w-[30px] p-0 [&_svg]:!w-[25px] [&_svg]:!h-[25px]"
            onClick={onMenuClick}
          >
            <Menu size={25} />
          </Button>
        </div>
      </div>


      {/* Queue Drawer */}
      <QueueDrawer 
        isOpen={showQueueDrawer} 
        onClose={() => setShowQueueDrawer(false)} 
      />
    </div>
  );
});