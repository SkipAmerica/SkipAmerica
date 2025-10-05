import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Search, TrendingUp, Users, User, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getProfileDisplayInfo } from '@/lib/profileUtils';

interface IOSTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showFollowing?: boolean;
  isCreator?: boolean;
  isLive?: boolean;
  isDiscoverable?: boolean;
  isTransitioning?: boolean;
  onToggleDiscoverable?: () => void;
  onEndCall?: () => void;
  profile?: {
    avatar_url?: string;
    full_name?: string;
  } | null;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export const IOSTabBar = React.memo(function IOSTabBar({ activeTab, onTabChange, showFollowing, isCreator, isLive, isDiscoverable, isTransitioning, onToggleDiscoverable, onEndCall, profile }: IOSTabBarProps) {
  const profileInfo = getProfileDisplayInfo(profile as any);
  const busyRef = React.useRef(false);
  const handleCenterAction = React.useCallback((e: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (busyRef.current || isTransitioning) return;
    
    // On Call page, center button is no-op
    if (activeTab === 'call') return;
    
    busyRef.current = true;
    setTimeout(() => { busyRef.current = false; }, 450);
    onToggleDiscoverable?.();
  }, [isTransitioning, activeTab, onToggleDiscoverable]);
  // Define tabs based on creator status
  const leftTabs: TabItem[] = [
    { id: 'discover', label: 'Discover', icon: Home },
    { id: 'live', label: 'Discoverable', icon: Users },
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
    <div
      className={cn(
        "ios-tab-bar",
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white backdrop-blur-md",
        "border-t border-border",
        "pb-safe-bottom"
      )}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform',
        contain: 'layout paint',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitTransform: 'translateZ(0)'
      }}
    >
      {/* Creator Layout with 5 tabs */}
      {isCreator ? (
        <div className="flex items-center w-full h-[49px]">
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
                    "px-1 py-1.5",
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
                </button>
              );
            })}
          </div>

          {/* Center Go Live button */}
          <div className="flex-shrink-0 px-2">
            <button
              type="button"
              disabled={!!isTransitioning}
              onClick={handleCenterAction}
              className={cn(
                "ios-touchable",
                "flex flex-col items-center justify-center",
                "transition-all duration-200",
                "disabled:opacity-60 disabled:pointer-events-none",
                isLive && "cursor-default"
              )}
              aria-disabled={!!isTransitioning}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center relative",
                "transform transition-all duration-200",
                "shadow-lg",
                isLive 
                  ? "bg-muted text-muted-foreground cursor-default" 
                  : isDiscoverable
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-cyan-500 text-white hover:bg-cyan-600 hover:scale-105"
              )}>
                <Sparkles size={16} />
              </div>
            </button>
          </div>

          {/* Right tabs */}
          <div className="flex flex-1 justify-around">
            {rightTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Use Avatar for Following tab
              if (tab.id === 'following') {
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "ios-touchable",
                      "flex flex-col items-center justify-center",
                      "min-w-0 relative",
                      "px-1 py-1.5",
                      "transition-all duration-200"
                    )}
                  >
                    <div className={cn(
                      "relative flex flex-col items-center",
                      "transform transition-transform duration-200",
                      isActive && "scale-110"
                    )}>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profileInfo.avatarUrl} alt={profileInfo.fullName} />
                        <AvatarFallback 
                          className="text-xs"
                          style={{
                            backgroundColor: profileInfo.backgroundColor,
                            color: profileInfo.textColor
                          }}
                        >
                          {profileInfo.initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </button>
                );
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "ios-touchable",
                    "flex flex-col items-center justify-center",
                    "min-w-0 relative",
                    "px-1 py-1.5",
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
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Non-creator layout with 4 tabs */
        <div className="flex items-center justify-around w-full h-[49px]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            // Use Avatar for Following tab
            if (tab.id === 'following') {
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "ios-touchable",
                    "flex flex-col items-center justify-center",
                    "min-w-0 flex-1 relative",
                    "px-1 py-1.5",
                    "transition-all duration-200"
                  )}
                >
                  <div className={cn(
                    "relative flex flex-col items-center",
                    "transform transition-transform duration-200",
                    isActive && "scale-110"
                  )}>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profileInfo.avatarUrl} alt={profileInfo.fullName} />
                      <AvatarFallback 
                        className="text-xs"
                        style={{
                          backgroundColor: profileInfo.backgroundColor,
                          color: profileInfo.textColor
                        }}
                      >
                        {profileInfo.initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              );
            }
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "ios-touchable",
                  "flex flex-col items-center justify-center",
                  "min-w-0 flex-1 relative",
                  "px-1 py-1.5",
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});