import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Shield, DollarSign, Clock, Star, Zap, TrendingUp, Bell, Search, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { useProfile } from "@/hooks/useProfile";
import { useSearch } from "@/app/providers/search-provider";
import { useDiscovery } from "@/app/providers/discovery-provider";
import { useLive } from '@/hooks/live';
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { UserMenu } from "@/components/UserMenu";
import CreatorDashboard from "@/components/CreatorDashboard";
import FanInterface from "@/components/FanInterface";
import VideoCallInterface from "@/components/VideoCallInterface";
import CreatorProfile from "@/components/CreatorProfile";
import { CallFlow } from "@/components/call/CallFlow";
import OnlineCreators from "@/components/OnlineCreators";
import ActivityFeed from "@/components/ActivityFeed";
import RatingSystem from "@/components/RatingSystem";
import { cn } from "@/shared/lib/utils";
import { InfluentialPeopleSearch } from "@/components/discovery/InfluentialPeopleSearch";
import DiscoverabilityModal from "@/components/DiscoverabilityModal";
import { AdBanner } from "@/components/ads/AdBanner";
import { ThreadsFeed } from "@/components/discovery/ThreadsFeed";
import { FeatureDemo } from "@/components/demo/FeatureDemo";
import { CreatorEconomyShowcase } from "@/components/demo/CreatorEconomyShowcase";
import { OnlineCreatorsGrid } from "@/components/OnlineCreatorsGrid";
import { ScheduleCreatorsGrid } from "@/components/ScheduleCreatorsGrid";
import { SwipeableCreatorCards } from "@/components/discovery/SwipeableCreatorCards";
import { DiscoveryModeToggle } from "@/components/discovery/DiscoveryModeToggle";
import { CreatorSearch } from "@/components/discovery/CreatorSearch";
import { CreatorSearchHeader } from "@/components/discovery/CreatorSearchHeader";
import { BrowseSubTabs } from "@/components/discovery/BrowseSubTabs";
import { FreezePane } from "@/components/navigation/FreezePane";
import { MatchSearchBar } from "@/components/match/MatchSearchBar";
import { ProfileCompletionBanner } from "@/components/creator/ProfileCompletionBanner";
import { NotificationZone } from "@/components/discovery/NotificationZone";
import { useNotificationRegistry } from "@/hooks/useNotificationRegistry";

import { AdPanel } from "@/components/ads/AdPanel";
import heroImage from "@/assets/hero-image.jpg";

import { SmartTrendingEngine } from "@/components/discovery/SmartTrendingEngine";
import { FanLoyaltyProgram } from "@/components/loyalty/FanLoyaltyProgram";
import { AdvancedCreatorSearch } from "@/components/discovery/AdvancedCreatorSearch";
import { CreatorProfileManagement } from "./CreatorProfileManagement";


// iOS Components
import { IOSTabBar } from "@/components/mobile/IOSTabBar";
import { IOSNavBar } from "@/components/mobile/IOSNavBar";
import { IOSInstagramHeader } from "@/components/mobile/IOSInstagramHeader";
import { IOSSearchBar } from "@/components/mobile/IOSSearchBar";
import { IOSActionSheet, IOSActionSheetItem } from "@/components/mobile/IOSActionSheet";
import { Separator } from "@/components/ui/separator";
import { LiveControlBar } from "@/components/live/LiveControlBar";
import { IOSModal } from "@/components/mobile/IOSModal";
import { IOSListView, IOSListSection, IOSListItem } from "@/components/mobile/IOSListView";
import { useKeyboardAware } from "@/hooks/use-keyboard-aware";
import { CreatorPostPrompt } from "@/components/creator/CreatorPostPrompt";

// Mock data - matches OnlineCreatorsGrid
const mockCreators = [
  { id: '1', name: 'Emma Stone', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', category: 'entertainment', isOnline: true, ratingsCount: 1240, rating: 4.9, title: 'Academy Award Winner', callRate: 150, maxCallDuration: 30 },
  { id: '2', name: 'Dr. Sarah Chen', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', category: 'technology', isOnline: true, ratingsCount: 890, rating: 4.8, title: 'AI Research Director', callRate: 200, maxCallDuration: 45 },
  { id: '3', name: 'Marcus Johnson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', category: 'business', isOnline: true, ratingsCount: 650, rating: 4.7, title: 'Serial Entrepreneur', callRate: 300, maxCallDuration: 60 },
  { id: '4', name: 'Zoe Rodriguez', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', category: 'beauty', isOnline: true, ratingsCount: 2100, rating: 4.9, title: 'Beauty Influencer', callRate: 100, maxCallDuration: 20 },
  { id: '5', name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', category: 'technology', isOnline: true, ratingsCount: 420, rating: 4.6, title: 'Lead Developer', callRate: 180, maxCallDuration: 40 },
  { id: '6', name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', category: 'entertainment', isOnline: true, ratingsCount: 1560, rating: 4.8, title: 'Grammy Nominee', callRate: 250, maxCallDuration: 35 },
];

const Index = () => {
  console.log('Index page is rendering...');
  const [activeTab, setActiveTab] = useState("discover");
  
  // Use discovery context instead of local state
  const { discoveryMode, browseMode, setBrowseMode, handleDiscoveryModeChange, resetToInitialState } = useDiscovery();
  const [threadsFeedKey, setThreadsFeedKey] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  
  // Use global search context
  const { filters, updateQuery, updateSelectedCategory } = useSearch();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  
  
  // Always call all hooks unconditionally at the top level
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const live = useLive();
  const { isKeyboardVisible } = useKeyboardAware(activeTab);
  const navigate = useNavigate();
  const { state: onboardingState } = useOnboardingProgress(user?.id || '');
  const { visibleNotifications, hasAnyVisible } = useNotificationRegistry();
  
  // Safely access live store values after hooks
  const isLive = live?.isLive || false;
  const isDiscoverable = live?.isDiscoverable || false;
  const isTransitioning = live?.isTransitioning || false;
  const toggleDiscoverable = live?.toggleDiscoverable || (() => {});
  const showDiscoverabilityModal = live?.showDiscoverabilityModal || false;
  const setDiscoverabilityModal = live?.setDiscoverabilityModal || (() => {});
  const endLive = live?.endLive || (() => {});

  // Stabilize iOS safe area top across keyboard show/hide
  useEffect(() => {
    const doc = document.documentElement;
    const style = getComputedStyle(doc);
    const top = style.getPropertyValue('--safe-area-top').trim() || '0px';
    doc.style.setProperty('--debug-safe-top', top);
  }, []);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleCreatorLike = useCallback((creatorId: string) => {
    console.log('Liked creator:', creatorId);
    // TODO: Implement AI algorithm fine-tuning for likes
  }, []);

  const handleCreatorPass = useCallback((creatorId: string) => {
    // TODO: Implement AI algorithm fine-tuning for passes
  }, []);

  const handleCreatorSuperLike = useCallback((creatorId: string) => {
    console.log('Super liked creator:', creatorId);
    // TODO: Implement AI algorithm fine-tuning for super likes
  }, []);

  const handleCreatorMessage = useCallback((creatorId: string) => {
    console.log('Messaging creator:', creatorId);
    // TODO: Open messaging interface
  }, []);

  const handleCreatorShare = useCallback((creatorId: string) => {
    console.log('Sharing creator:', creatorId);
    // TODO: Implement sharing functionality
  }, []);

  const handleCreatorBookmark = useCallback((creatorId: string) => {
    console.log('Bookmarked creator:', creatorId);
    // TODO: Implement bookmark functionality
  }, []);

  // Handle video call
  const handleCreatorSelect = useCallback((creatorId: string) => {
    setActiveCall(creatorId);
  }, []);

  const handleEndCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  // Handle discover tab refresh - always works, even when already on discover tab
  const handleDiscoverTabClick = useCallback(() => {
    // Always refresh content and scroll to top
    resetToInitialState();
    setThreadsFeedKey(prev => prev + 1);
    
    // Scroll to top
    const scrollContainer = document.querySelector('[data-scroll-container]');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setActiveTab("discover");
  }, [resetToInitialState]);

  // Show CallFlow if call is active
  if (activeCall) {
    const creator = mockCreators.find(c => c.id === activeCall);
    if (creator) {
      return (
        <CallFlow
          creator={creator}
          fan={{
            id: user?.id || 'fan-1',
            name: user?.user_metadata?.full_name || profile?.full_name || 'Fan User',
            avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
          }}
          onEndCall={handleEndCall}
          isCreatorView={false}
        />
      );
    }
  }

  // Handle different views
  if (activeTab === "creator-dashboard") {
    return <CreatorDashboard onBack={() => setActiveTab("discover")} />;
  }

  if (activeTab === "fan-interface") {
    return <FanInterface onBack={() => setActiveTab("discover")} />;
  }

  if (activeTab === "call") {
    return <VideoCallInterface onBack={() => setActiveTab("discover")} />;
  }

  if (activeTab === "creator-profile") {
    return (
      <CreatorProfile 
        onBack={() => setActiveTab("discover")} 
        onStartCall={() => setActiveTab("call")}
      />
    );
  }

  // Check if current tab should show discovery toggle
  const showDiscoveryToggle = activeTab === "discover";

  // Memoize expensive tab content rendering to prevent unnecessary re-renders
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case "discover":
        return (
          <div className="pb-0 bg-background"
               style={{ 
                 overscrollBehavior: 'none',
                 touchAction: 'pan-y',
                 WebkitOverflowScrolling: 'touch'
               }}>
              {/* Mode-specific content - content scrolls underneath sticky elements */}
              {discoveryMode === 'discover' && (
                <>
                  {import.meta.env.DEV && console.log('[Index] Rendering NotificationZone:', { 
                    hasAnyVisible, 
                    notificationCount: visibleNotifications.length 
                  })}
                  <NotificationZone stickyOffset={144} hasVisibleNotifications={hasAnyVisible}>
                    {visibleNotifications.map((notification) => (
                      <div key={notification.id}>
                        {notification.component}
                      </div>
                    ))}
                  </NotificationZone>
                  <ThreadsFeed 
                    key={threadsFeedKey}
                    hasNotificationZone={hasAnyVisible}
                  />
                </>
              )}

             {discoveryMode === 'browse' && (
               <div className="px-4 pt-2">
                 {browseMode === 'live' ? (
                   <OnlineCreatorsGrid 
                     selectedCategory={filters.selectedCategory}
                     onCreatorSelect={handleCreatorSelect}
                     hideHeader={true}
                   />
                 ) : (
                   <ScheduleCreatorsGrid 
                     selectedCategory={filters.selectedCategory}
                     onCreatorSelect={handleCreatorSelect}
                     hideHeader={true}
                   />
                 )}
               </div>
             )}

             {discoveryMode === 'match' && (
               <div className="px-4 pt-3 min-h-screen">
                 <SwipeableCreatorCards
                   selectedCategory={filters.selectedCategory}
                   onCreatorLike={handleCreatorLike}
                   onCreatorPass={handleCreatorPass}
                   onCreatorSuperLike={handleCreatorSuperLike}
                   onCreatorMessage={handleCreatorMessage}
                   onCreatorShare={handleCreatorShare}
                   onCreatorBookmark={handleCreatorBookmark}
                 />
               </div>
             )}
           </div>
        );

      case "live":
        return (
          <div className="pb-20 px-4 pt-4 bg-background">
            <OnlineCreatorsGrid 
              selectedCategory={filters.selectedCategory}
              onCreatorSelect={handleCreatorSelect}
              hideHeader={false}
            />
          </div>
        );


      case "search":
        return (
          <div className="pb-20 px-4 pt-4 bg-background">
            <div className="flex justify-end mb-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveTab("advanced")}
                className="text-primary font-medium px-0 h-auto underline hover:no-underline"
              >
                Creator Matchmaker
              </Button>
            </div>
            <CreatorSearch 
              onCreatorSelect={(creator) => handleCreatorSelect(creator.id)}
              onStartCall={(creator) => handleCreatorSelect(creator.id)}
            />
          </div>
        );

      case "advanced":
        return (
          <AdvancedCreatorSearch onBack={() => setActiveTab("search")} />
        );

      case "creator-profile-management":
        return <CreatorProfileManagement />;

      case "following":
        return profile?.account_type === 'creator' ? (
          <CreatorProfileManagement />
        ) : (
          <div className="pb-20 px-4 pt-4 space-y-6 bg-background">
            <FanLoyaltyProgram />
            <ActivityFeed />
          </div>
        );

      default:
        return null;
    }
  }, [activeTab, discoveryMode, browseMode, filters.selectedCategory, filters.query, handleCreatorSelect, handleCreatorLike, handleCreatorPass, handleCreatorSuperLike, handleCreatorMessage, handleCreatorShare, handleCreatorBookmark]);

  // Redirect non-logged in users to auth page
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Main iOS interface for signed in users
  return (
    <div className="min-h-screen bg-background relative">
      {/* Status Bar Overlay - prevents content from showing above DMT */}
      <div 
        className="pointer-events-none fixed top-0 left-0 right-0 z-[100] bg-gradient-to-b from-turquoise-600 to-turquoise-500"
        style={{ height: 'calc(var(--debug-safe-top) + 4px)' }}
      />
      
      <div
        data-scroll-container
        className="relative h-screen overflow-y-auto overflow-x-hidden pb-[var(--ios-tab-bar-height)]"
        style={{ 
          overscrollBehavior: 'none', 
          WebkitOverflowScrolling: 'touch', 
          touchAction: 'pan-y'
        }}
      >
        {/* iOS Navigation Bar - Hide when in advanced tab */}
        {activeTab !== "advanced" && (
          <IOSInstagramHeader 
            onMenuClick={() => setShowMenu(true)}
            onCreatorSelect={(id) => setActiveTab("creator-profile")}
            hideBottomRow={activeTab === "following" && profile?.account_type === 'creator'}
          />
        )}

        {/* Sticky Header - Discovery Mode Toggle and Conditional Content */}
        {activeTab === "discover" && showDiscoveryToggle && (
          <div className="sticky top-[calc(var(--debug-safe-top)+48px)] z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
            <DiscoveryModeToggle 
              mode={discoveryMode} 
              onModeChange={handleDiscoveryModeChange}
            />
            
            {/* Show FreezePane content only for browse mode */}
            {discoveryMode === 'browse' && (
              <FreezePane
                showDiscoveryToggle={false}
                searchValue={filters.query}
                onSearchChange={updateQuery}
                searchPlaceholder="Filter creators..."
                className="border-t-0"
              />
            )}
            
            {/* Show MatchSearchBar flush with toggle for match mode */}
            {discoveryMode === 'match' && (
              <MatchSearchBar
                value={filters.query}
                onChange={updateQuery}
                className="border-t-0"
              />
            )}
          </div>
        )}

        {/* Ad Panel - Only show in discover mode, not in browse or match */}
        {activeTab === "discover" && discoveryMode === 'discover' && (
          <div className="sticky top-[calc(var(--debug-safe-top)+48px+48px)] z-40">
            <AdPanel />
          </div>
        )}


        {/* Main Content - Scrolls with header & freeze pane */}
        <div className={cn(
          "relative z-10 bg-white",
          activeTab === "discover" && discoveryMode === 'discover' 
            ? "-mt-24 md:-mt-36" 
            : "-mt-[48px]"
        )}>
          {renderTabContent}
        </div>
      </div>

      {/* Creator Post Prompt - Only show for creators */}
      {profile?.account_type === 'creator' && (
        <CreatorPostPrompt isVisible={!isKeyboardVisible} />
      )}

      {/* Live Control Bar - Shows when live */}
      <LiveControlBar />

      {/* iOS Tab Bar */}
      <IOSTabBar
        profile={profile}
          activeTab={activeTab} 
          onTabChange={(tab) => {
            if (tab === "discover") {
              handleDiscoverTabClick();
            } else {
              setActiveTab(tab);
            }
          }}
          showFollowing={!!user}
          isCreator={profile?.account_type === 'creator'}
          isLive={isLive}
          isDiscoverable={isDiscoverable}
          isTransitioning={isTransitioning}
          onToggleDiscoverable={toggleDiscoverable}
          onEndCall={endLive}
        />

      {/* User Menu Action Sheet */}
      <IOSActionSheet
        trigger={<></>}
        open={showMenu}
        onOpenChange={setShowMenu}
        title="Account"
      >
        {user && (
          <>
            <IOSActionSheetItem
              onClick={() => {
                setActiveTab("creator-profile-management");
                setShowMenu(false);
              }}
              icon={Users}
            >
              Profile
            </IOSActionSheetItem>
            <IOSActionSheetItem
              onClick={() => {
                setActiveTab("discover");
                resetToInitialState();
                setShowMenu(false);
              }}
              icon={Bell}
            >
              Feed
            </IOSActionSheetItem>
            {profile?.account_type === 'creator' && (
              <IOSActionSheetItem
                onClick={() => {
                  setActiveTab("creator-dashboard");
                  setShowMenu(false);
                }}
                icon={Star}
              >
                Creator Hub
              </IOSActionSheetItem>
            )}
            
            <Separator className="my-2" />
            
            <IOSActionSheetItem
              onClick={async () => {
                setShowMenu(false);
                // Reset local state first
                setActiveTab("discover");
                resetToInitialState();
                // Then sign out and navigate
                await signOut();
                navigate("/auth", { replace: true });
              }}
              icon={LogOut}
              destructive
            >
              Sign Out
            </IOSActionSheetItem>
          </>
        )}
        {!user && (
          <>
            <IOSActionSheetItem
              onClick={() => {
                navigate("/auth");
                setShowMenu(false);
              }}
              icon={Users}
            >
              Sign In
            </IOSActionSheetItem>
            <IOSActionSheetItem
              onClick={() => {
                navigate("/auth");
                setShowMenu(false);
              }}
              icon={Zap}
            >
              Join Skip
            </IOSActionSheetItem>
          </>
        )}
      </IOSActionSheet>

      {/* Rating Modal */}
      {showRatingModal && selectedCreator && (
        <IOSModal
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          title="Rate Creator"
        >
          <RatingSystem 
            isCreator={false}
            targetName="Creator"
            targetAvatar=""
            onRatingSubmit={(rating, comment, tags) => {
              console.log('Rating submitted:', { rating, comment, tags });
              setShowRatingModal(false);
            }}
            onClose={() => setShowRatingModal(false)}
          />
        </IOSModal>
      )}

      {/* Discoverability Modal */}
      <DiscoverabilityModal
        open={showDiscoverabilityModal}
        onClose={() => setDiscoverabilityModal(false)}
      />
    </div>
  );
};

export default Index;