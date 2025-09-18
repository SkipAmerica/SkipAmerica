import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Search, TrendingUp, Users, User, Sparkle } from 'lucide-react';

interface IOSTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showFollowing?: boolean;
  isCreator?: boolean;
  isLive?: boolean;
  onToggleLive?: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export function IOSTabBar({ activeTab, onTabChange, showFollowing, isCreator, isLive, onToggleLive }: IOSTabBarProps) {
  // Define tabs based on creator status
  const leftTabs: TabItem[] = [
    { id: 'discover', label: 'Discover', icon: Home },
    { id: 'live', label: 'Live', icon: Users },
  ];

  const rightTabs: TabItem[] = [
    { id: 'search', label: 'Search', icon: Search },
  ];

  // Add following tab if user is authenticated
  if (showFollowing) {
    rightTabs.push({ id: 'following', label: 'Following', icon: User });
  }

  // For non-creators, use traditional layout
  const tabs: TabItem[] = !isCreator 
    ? [...leftTabs, ...rightTabs]
    : [];

  return (
    <div className={cn(
      "ios-tab-bar",
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-card/95 backdrop-blur-md",
      "border-t border-border/50",
      "pt-1"
    )}>
      {/* Creator Layout with 5 tabs */}
      {isCreator ? (
        <div className="flex items-center w-full">
          {/* Left tabs */}
          <div className="flex flex-1 justify-around">
            {leftTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "ios-touchable",
                    "flex flex-col items-center justify-center",
                    "min-w-0 relative",
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
                  </div>
                  <span className={cn(
                    "text-xs font-medium mt-1 mb-1",
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

          {/* Center Go Live button */}
          <div className="flex-shrink-0 px-2">
            <button
              onClick={onToggleLive}
              className={cn(
                "ios-touchable",
                "flex flex-col items-center justify-center",
                "transition-all duration-200"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                "transform transition-all duration-200",
                "shadow-lg",
                isLive 
                  ? "bg-destructive text-destructive-foreground scale-110" 
                  : "bg-cyan-500 text-white hover:bg-cyan-600 hover:scale-105"
              )}>
                {isLive ? (
                  <span className="text-sm font-bold">End</span>
                ) : (
                  <span className="text-xs font-bold">LIVE</span>
                )}
              </div>
            </button>
          </div>

          {/* Right tabs */}
          <div className="flex flex-1 justify-around">
            {rightTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "ios-touchable",
                    "flex flex-col items-center justify-center",
                    "min-w-0 relative",
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
                  </div>
                  <span className={cn(
                    "text-xs font-medium mt-1 mb-1",
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
        </div>
      ) : (
        /* Non-creator layout with 4 tabs */
        <div className="flex items-center justify-around w-full">
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
                  "text-xs font-medium mt-1 mb-1",
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
      )}
    </div>
  );
}