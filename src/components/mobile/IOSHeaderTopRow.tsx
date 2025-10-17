import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Menu, CalendarDays, Users } from 'lucide-react';

interface InboxCounts {
  standard_unread: number;
  priority_unread: number;
  offers_new: number;
  requests_unread: number;
}

interface IOSHeaderTopRowProps {
  onMenuClick?: () => void;
  queueCount: number;
  onQueueClick: () => void;
  inboxCounts: InboxCounts;
  accountType?: string;
}

export const IOSHeaderTopRow = React.memo(function IOSHeaderTopRow({
  onMenuClick,
  queueCount,
  onQueueClick,
  inboxCounts,
  accountType,
}: IOSHeaderTopRowProps) {
  const navigate = useNavigate();

  return (
    <div className="z-30 sticky top-0 w-full bg-white border-b border-border px-4">
      <div className="flex items-center justify-between h-[56px]">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight text-cyan-500">
            <span>Sk</span>
            <span className="relative">
              <span>i</span>
              <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-500 rounded-full"></span>
            </span>
            <span>p</span>
          </h1>
        </div>
        <div className="flex items-center space-x-[2px]">
          <Button 
            variant="ghost"
            className="ios-touchable h-[56px] w-[36px] p-0 relative [&_svg]:!w-[26px] [&_svg]:!h-[26px]"
            onClick={onQueueClick}
            disabled={queueCount === 0}
          >
            <Users size={26} />
            {queueCount > 0 && (
              <div className="absolute top-1 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {queueCount}
              </div>
            )}
          </Button>
          <Button variant="ghost" className="ios-touchable h-[56px] w-[36px] p-0 relative [&_svg]:!w-[26px] [&_svg]:!h-[26px]">
            <CalendarDays size={26} />
            <div className="absolute top-1 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              3
            </div>
          </Button>
          {accountType === 'creator' && (
            <Button 
              variant="ghost"
              className="ios-touchable h-[56px] w-[36px] p-0 relative [&_svg]:!w-[26px] [&_svg]:!h-[26px]"
              onClick={() => navigate('/inbox')}
            >
              <Mail size={26} />
              
              {inboxCounts.standard_unread > 0 && (
                <span className="absolute top-1 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-xs text-center text-white font-medium flex items-center justify-center">
                  {inboxCounts.standard_unread}
                </span>
              )}
              
              {(inboxCounts.priority_unread > 0 || inboxCounts.offers_new > 0) && (
                <span className="absolute top-4 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-turquoise-extra-light flex items-center justify-center text-white text-[9px] font-bold">$</span>
              )}
            </Button>
          )}
          <Button 
            variant="ghost"
            className="ios-touchable h-[56px] w-[36px] p-0 [&_svg]:!w-[30px] [&_svg]:!h-[30px]"
            onClick={onMenuClick}
          >
            <Menu size={30} />
          </Button>
        </div>
      </div>
    </div>
  );
});
