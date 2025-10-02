import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInboxStore, InboxTab } from '@/stores/inbox-store';
import { DollarSign, Star, MessageSquare, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs: Array<{ id: InboxTab; label: string; icon: typeof DollarSign }> = [
  { id: 'offers', label: 'Offers', icon: DollarSign },
  { id: 'priority', label: 'Priority', icon: Star },
  { id: 'standard', label: 'Standard', icon: MessageSquare },
  { id: 'requests', label: 'Requests', icon: Inbox },
];

export function InboxTabs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeTab, setActiveTab, saveScrollPosition } = useInboxStore();

  const handleTabClick = (tabId: InboxTab) => {
    // Save current scroll position
    const container = document.getElementById('thread-list-container');
    if (container) {
      saveScrollPosition(activeTab, container.scrollTop);
    }

    // Update tab
    setActiveTab(tabId);
    
    // Update URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tabId);
    navigate(`/inbox?${newParams.toString()}`, { replace: true });
  };

  return (
    <div className="flex gap-2 p-4 border-b border-border/50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200',
              isActive
                ? 'bg-accent/20 backdrop-blur-xl border border-accent/30 shadow-lg'
                : 'bg-muted/50 border border-border/50 hover:bg-muted'
            )}
          >
            <Icon className={cn(
              'w-4 h-4',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-medium',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
