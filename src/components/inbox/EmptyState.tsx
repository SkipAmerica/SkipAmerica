import { DollarSign, Star, MessageSquare, Inbox } from 'lucide-react';
import { InboxTab } from '@/stores/inbox-store';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  tab: InboxTab;
}

const emptyStates: Record<InboxTab, { icon: typeof DollarSign; title: string; description: string }> = {
  offers: {
    icon: DollarSign,
    title: 'No offers yet',
    description: 'Turn on Fast Track to receive direct paid offers.',
  },
  priority: {
    icon: Star,
    title: 'No priority messages',
    description: 'Set a DM fee to filter serious outreach.',
  },
  standard: {
    icon: MessageSquare,
    title: 'No new messages',
    description: 'Your standard conversations will appear here.',
  },
  requests: {
    icon: Inbox,
    title: 'No message requests',
    description: 'New message requests from fans will appear here.',
  },
};

export function EmptyState({ tab }: EmptyStateProps) {
  const state = emptyStates[tab];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center mb-4',
        'bg-white/10 backdrop-blur-xl border border-white/20'
      )}>
        <Icon className="w-8 h-8 text-white/40" />
      </div>
      <h3 className="text-lg font-semibold text-white/90 mb-2">
        {state.title}
      </h3>
      <p className="text-sm text-white/60 max-w-sm">
        {state.description}
      </p>
    </div>
  );
}
