import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Shield, DollarSign, Clock, Star, Zap, TrendingUp, Bell, Search, Menu } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { useProfile } from "@/hooks/useProfile";
import { useSearch } from "@/app/providers/search-provider";
import { UserMenu } from "@/components/UserMenu";
import CreatorDashboard from "@/components/CreatorDashboard";
import FanInterface from "@/components/FanInterface";
import VideoCallInterface from "@/components/VideoCallInterface";
import CreatorProfile from "@/components/CreatorProfile";
import { CallFlow } from "@/components/call/CallFlow";
import OnlineCreators from "@/components/OnlineCreators";
import ActivityFeed from "@/components/ActivityFeed";
import RatingSystem from "@/components/RatingSystem";
import { InfluentialPeopleSearch } from "@/components/discovery/InfluentialPeopleSearch";
import { EventCountdown } from "@/components/events/EventCountdown";
import { AdBanner } from "@/components/ads/AdBanner";
import { FeatureDemo } from "@/components/demo/FeatureDemo";
import { CreatorEconomyShowcase } from "@/components/demo/CreatorEconomyShowcase";
import { UserInterestFilters } from "@/components/UserInterestFilters";
import { OnlineCreatorsGrid } from "@/components/OnlineCreatorsGrid";
import { ScheduleCreatorsGrid } from "@/components/ScheduleCreatorsGrid";
import { SwipeableCreatorCards } from "@/components/discovery/SwipeableCreatorCards";
import { DiscoveryModeToggle } from "@/components/discovery/DiscoveryModeToggle";
import { CreatorSearch } from "@/components/discovery/CreatorSearch";
import { CreatorSearchHeader } from "@/components/discovery/CreatorSearchHeader";
import { BrowseSubTabs } from "@/components/discovery/BrowseSubTabs";
import { FreezePane } from "@/components/navigation/FreezePane";
import heroImage from "@/assets/hero-image.jpg";

import { SmartTrendingEngine } from "@/components/discovery/SmartTrendingEngine";
import { FanLoyaltyProgram } from "@/components/loyalty/FanLoyaltyProgram";
import { AdvancedCreatorSearch } from "@/components/discovery/AdvancedCreatorSearch";


// iOS Components
import { IOSTabBar } from "@/components/mobile/IOSTabBar";
import { IOSNavBar } from "@/components/mobile/IOSNavBar";
import { IOSInstagramHeader } from "@/components/mobile/IOSInstagramHeader";
import { IOSSearchBar } from "@/components/mobile/IOSSearchBar";
import { IOSActionSheet, IOSActionSheetItem } from "@/components/mobile/IOSActionSheet";
import { IOSModal } from "@/components/mobile/IOSModal";
import { IOSListView, IOSListSection, IOSListItem } from "@/components/mobile/IOSListView";

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
  const [discoveryMode, setDiscoveryMode] = useState<'browse' | 'match' | 'search'>('browse');
  const [browseMode, setBrowseMode] = useState<'live' | 'schedule'>('live');
  
  const handleDiscoveryModeChange = (mode: 'browse' | 'match' | 'search') => {
    console.log('Index - discovery mode changing from', discoveryMode, 'to', mode);
    setDiscoveryMode(mode);
  };
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  
  // Use global search context
  const { filters, updateQuery, updateSelectedCategory } = useSearch();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const el = document.getElementById("ig-header");
      if (el) setHeaderHeight(el.getBoundingClientRect().height);
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);
  
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  // Handle swipeable card actions
  const handleCreatorLike = (creatorId: string) => {
    console.log('Liked creator:', creatorId);
    // TODO: Implement AI algorithm fine-tuning for likes
  };

  const handleCreatorPass = (creatorId: string) => {
    // TODO: Implement AI algorithm fine-tuning for passes
  };

  const handleCreatorSuperLike = (creatorId: string) => {
    console.log('Super liked creator:', creatorId);
    // TODO: Implement AI algorithm fine-tuning for super likes
  };

  const handleCreatorMessage = (creatorId: string) => {
    console.log('Messaging creator:', creatorId);
    // TODO: Open messaging interface
  };

  const handleCreatorShare = (creatorId: string) => {
    console.log('Sharing creator:', creatorId);
    // TODO: Implement sharing functionality
  };

  const handleCreatorBookmark = (creatorId: string) => {
    console.log('Bookmarked creator:', creatorId);
    // TODO: Implement bookmark functionality
  };

  // Handle video call
  const handleCreatorSelect = (creatorId: string) => {
    setActiveCall(creatorId);
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "discover":
        return (
          <div className="h-full flex flex-col" style={{ paddingTop: `${headerHeight}px` }}>
            {/* Freeze Pane */}
            <FreezePane
              showDiscoveryToggle={showDiscoveryToggle}
              discoveryMode={discoveryMode}
              onDiscoveryModeChange={handleDiscoveryModeChange}
              showBrowseSubTabs={discoveryMode === 'browse'}
              browseMode={browseMode}
              onBrowseModeChange={setBrowseMode}
              searchValue={discoveryMode === 'browse' ? filters.query : ''}
              onSearchChange={updateQuery}
              searchPlaceholder="Filter creators..."
              showInterestFilters={true}
              selectedFilters={filters.selectedCategory === 'all' ? ['all'] : [filters.selectedCategory]}
              onFiltersChange={(newFilters) => {
                // Convert array back to single category for existing logic
                const newCategory = newFilters.includes('all') ? 'all' : newFilters[0] || 'all';
                updateSelectedCategory(newCategory);
              }}
              headerHeight={0}
            />
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-20">
              <div className="px-4 pt-2">
                {discoveryMode === 'match' ? (
                  <SwipeableCreatorCards
                    selectedCategory={filters.selectedCategory}
                    onCreatorLike={handleCreatorLike}
                    onCreatorPass={handleCreatorPass}
                    onCreatorSuperLike={handleCreatorSuperLike}
                    onCreatorMessage={handleCreatorMessage}
                    onCreatorShare={handleCreatorShare}
                    onCreatorBookmark={handleCreatorBookmark}
                  />
                ) : discoveryMode === 'browse' ? (
                  <>
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
                  </>
                ) : (
                  <CreatorSearch 
                    onCreatorSelect={(creator) => handleCreatorSelect(creator.id)}
                    onStartCall={(creator) => handleCreatorSelect(creator.id)}
                  />
                )}
              </div>
            </div>
          </div>
        );

      case "live":
        return (
          <div className="h-full flex flex-col overflow-hidden" style={{ paddingTop: `${headerHeight}px` }}>
            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
              <OnlineCreatorsGrid 
                selectedCategory={filters.selectedCategory}
                onCreatorSelect={handleCreatorSelect}
                hideHeader={false}
              />
            </div>
          </div>
        );


      case "search":
        return (
          <div className="h-full flex flex-col" style={{ paddingTop: `${headerHeight}px` }}>
            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
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
          </div>
        );

      case "advanced":
        return (
          <AdvancedCreatorSearch onBack={() => setActiveTab("search")} />
        );

      case "following":
        return (
          <div className="h-full flex flex-col" style={{ paddingTop: `${headerHeight}px` }}>
            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4 space-y-6">
              <FanLoyaltyProgram />
              <ActivityFeed />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Redirect non-logged in users to auth page
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Main iOS interface for signed in users
  return (
    <div className="min-h-screen bg-background relative">
      {/* iOS Navigation Bar - Hide when in advanced tab */}
      {activeTab !== "advanced" && (
        <IOSInstagramHeader 
          onMenuClick={() => setShowMenu(true)}
          onCreatorSelect={(id) => setActiveTab("creator-profile")}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col h-screen">
        {/* Tab Content - Scrollable area */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      </div>

      {/* iOS Tab Bar */}
      <IOSTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFollowing={!!user}
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
                navigate("/profile");
                setShowMenu(false);
              }}
              icon={Users}
            >
              Profile
            </IOSActionSheetItem>
            <IOSActionSheetItem
              onClick={() => {
                navigate("/feed");
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
    </div>
  );
};

export default Index;