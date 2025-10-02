import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInboxStore, InboxTab } from '@/stores/inbox-store';
import { DollarSign, Star, MessageSquare, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs: Array<{ id: InboxTab; label: string; icon: typeof DollarSign }> = [
  { id: 'standard', label: 'Standard', icon: MessageSquare },
  { id: 'priority', label: 'Priority', icon: Star },
  { id: 'offers', label: 'Offers', icon: DollarSign },
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

  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="relative flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
        {/* Sliding active indicator */}
        <div
          className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 ease-out"
          style={{
            left: `${activeIndex * 25}%`,
            width: 'calc(25% - 0.5rem)',
            marginLeft: '0.25rem',
          }}
        />
        
        {/* Tab buttons */}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 z-10',
                isActive
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className={cn(
                'w-4 h-4 transition-colors',
                isActive ? 'text-primary' : 'text-gray-500'
              )} />
              <span className={cn(
                'text-sm font-medium transition-colors'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
