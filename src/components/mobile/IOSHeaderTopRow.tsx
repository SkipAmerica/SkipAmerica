import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Menu, CalendarDays, Users } from 'lucide-react';
import { HeaderIcon } from './HeaderIcon';

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

  const totalUnread = inboxCounts.standard_unread + inboxCounts.priority_unread + inboxCounts.requests_unread;
  const hasPriority = inboxCounts.priority_unread > 0 || inboxCounts.offers_new > 0;

  return (
    <div className="z-30 sticky top-0 w-full bg-white">
      <div className="flex items-center justify-between h-[56px] pr-4 pl-4">
        {/* Logo */}
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

        {/* Action Icons */}
        <div className="flex items-center gap-[14px]">
          <HeaderIcon
            icon={<Users />}
            tone="queue"
            count={queueCount}
            ariaLabel={queueCount > 0 ? `Queue, ${queueCount} waiting` : 'Queue, empty'}
            onClick={onQueueClick}
            disabled={queueCount === 0}
          />

          <HeaderIcon
            icon={<CalendarDays />}
            tone="calendar"
            count={3}
            ariaLabel="Calendar, 3 upcoming"
          />

          {accountType === 'creator' && (
            <HeaderIcon
              icon={<Mail />}
              tone="message"
              count={totalUnread}
              priority={hasPriority && totalUnread === 0}
              ariaLabel={
                totalUnread > 0
                  ? `Messages, ${totalUnread} unread`
                  : hasPriority
                  ? 'Messages, priority offer'
                  : 'Messages'
              }
              onClick={() => navigate('/inbox')}
            />
          )}

          <Button
            variant="ghost"
            className="w-10 h-10 p-0 rounded-lg [&_svg]:w-6 [&_svg]:h-6 [&_svg]:text-[--ink-900] hover:bg-muted/50"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu />
          </Button>
        </div>
      </div>
    </div>
  );
});
