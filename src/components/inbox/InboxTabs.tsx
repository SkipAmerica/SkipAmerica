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
    <div className="flex gap-2 p-4 border-b border-gray-200 bg-white">
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
                ? 'bg-gray-100 border border-gray-200 shadow-sm'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            )}
          >
            <Icon className={cn(
              'w-4 h-4',
              isActive ? 'text-primary' : 'text-gray-500'
            )} />
            <span className={cn(
              'text-sm font-medium',
              isActive ? 'text-gray-900' : 'text-gray-600'
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
