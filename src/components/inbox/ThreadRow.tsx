import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreadRowProps {
  thread: {
    id: string;
    type: string;
    last_message_at: string;
    last_message_preview: string;
    unread_count_creator: number;
    user: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
    offer?: {
      amount_cents: number;
      currency: string;
      duration_minutes: number;
      status: string;
    };
  };
  onClick: () => void;
}

export function ThreadRow({ thread, onClick }: ThreadRowProps) {
  const isUnread = thread.unread_count_creator > 0;
  const formattedTime = formatDistanceToNow(new Date(thread.last_message_at), {
    addSuffix: true,
  });

  const getTypePill = () => {
    if (thread.type === 'offer' && thread.offer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 border border-accent/30 text-xs text-white/90">
          <DollarSign className="w-3 h-3" />
          Offer • ${(thread.offer.amount_cents / 100).toFixed(0)}/{thread.offer.duration_minutes}m
        </span>
      );
    }
    if (thread.type === 'priority') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs text-white/90">
          <Star className="w-3 h-3" />
          Priority
        </span>
      );
    }
    return null;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-2xl transition-all duration-200 text-left',
        'bg-white/8 border border-white/10 hover:bg-white/12',
        'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
        isUnread && 'ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-12 h-12 ring-2 ring-white/10">
          <AvatarImage src={thread.user.avatar_url} alt={thread.user.full_name} />
          <AvatarFallback className="bg-primary/20 text-white/90">
            {thread.user.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white/90 truncate">
                {thread.user.full_name}
              </h3>
              {isUnread && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-white/40 flex-shrink-0">
              {formattedTime}
            </span>
          </div>

          {/* Type Pill */}
          {getTypePill() && (
            <div className="mb-2">
              {getTypePill()}
            </div>
          )}

          {/* Message Preview */}
          <p className="text-sm text-white/60 line-clamp-2">
            {thread.last_message_preview || 'No messages yet'}
          </p>
        </div>
      </div>
    </button>
  );
}
