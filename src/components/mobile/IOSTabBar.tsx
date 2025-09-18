import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Search, TrendingUp, Users, User } from 'lucide-react';

interface IOSTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showFollowing?: boolean;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export function IOSTabBar({ activeTab, onTabChange, showFollowing }: IOSTabBarProps) {
  const baseTabs: TabItem[] = [
    { id: 'discover', label: 'Discover', icon: Home },
    { id: 'live', label: 'Live', icon: Users },
    { id: 'search', label: 'Search', icon: Search },
  ];

  const tabs: TabItem[] = showFollowing 
    ? [...baseTabs, { id: 'following', label: 'Following', icon: User }]
    : baseTabs;

  return (
    <div className={cn(
      "ios-tab-bar",
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-card/95 backdrop-blur-md",
      "border-t border-border/50",
      "flex items-center justify-around",
      "pt-1"
    )}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "ios-touchable",
              "flex flex-col items-center justify-center",
              "min-w-0 flex-1 relative",
              "px-1 py-1 pb-0",
              "transition-all duration-200"
            )}
          >
            <div className={cn(
              "relative flex flex-col items-center",
              "transform transition-transform duration-200",
              isActive && "scale-110"
            )}>
              <Icon
                size={24}
                className={cn(
                  "transition-colors duration-200",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              />
              {tab.badge && (
                <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {tab.badge}
                </div>
              )}
            </div>
            <span className={cn(
              "text-xs font-medium mt-1",
              "transition-colors duration-200",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}