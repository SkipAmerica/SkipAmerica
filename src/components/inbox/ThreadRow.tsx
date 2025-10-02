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
    } | null;
    priority_payment?: {
      amount_cents: number;
      currency: string;
      status: string;
    }[] | null;
  };
  onClick: () => void;
}

export function ThreadRow({ thread, onClick }: ThreadRowProps) {
  const isUnread = thread.unread_count_creator > 0;
  const formattedTime = formatDistanceToNow(new Date(thread.last_message_at), {
    addSuffix: true,
  });

  const renderOfferBadge = () => {
    if (thread.type === 'offer' && thread.offer) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600 text-white font-semibold text-sm mb-2">
          <Star className="w-4 h-4 fill-white" />
          ${(thread.offer.amount_cents / 100).toFixed(0)} • {thread.offer.duration_minutes}m
        </div>
      );
    }
    
    if (thread.type === 'priority' && thread.priority_payment && thread.priority_payment[0]) {
      const payment = thread.priority_payment[0];
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600 text-white font-semibold text-sm mb-2">
          <Star className="w-4 h-4 fill-white" />
          Priority • ${(payment.amount_cents / 100).toFixed(0)}
        </div>
      );
    }
    
    return null;
  };

  const getTypePill = () => {
    if (thread.type === 'priority') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
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
        'w-full p-4 rounded-xl transition-all duration-200 text-left border-b border-gray-100',
        'bg-white hover:bg-gray-50',
        isUnread && 'bg-blue-50/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-12 h-12 ring-2 ring-gray-200">
          <AvatarImage src={thread.user.avatar_url} alt={thread.user.full_name} />
          <AvatarFallback className="bg-gray-100 text-gray-900">
            {thread.user.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Offer Badge - Prominent */}
          {renderOfferBadge()}
          
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">
                {thread.user.full_name}
              </h3>
              {isUnread && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
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
          <p className="text-sm text-gray-600 line-clamp-2">
            {thread.last_message_preview || 'No messages yet'}
          </p>
        </div>
      </div>
    </button>
  );
}
