import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Shield, DollarSign, Clock, Star, Zap, TrendingUp, Bell, Search, Menu, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
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
import heroImage from "@/assets/hero-image.jpg";

import { SmartTrendingEngine } from "@/components/discovery/SmartTrendingEngine";
import { FanLoyaltyProgram } from "@/components/loyalty/FanLoyaltyProgram";
import { AdvancedCreatorSearch } from "@/components/discovery/AdvancedCreatorSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [discoveryMode, setDiscoveryMode] = useState<'grid' | 'cards' | 'schedule'>('cards');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [liveNowOpen, setLiveNowOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
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
    console.log('Passed creator:', creatorId);
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "discover":
        return (
          <div className="space-y-6">
            {/* Discovery Mode Toggle */}
            <div>
              <DiscoveryModeToggle 
                mode={discoveryMode}
                onModeChange={setDiscoveryMode}
                className="w-full sticky z-30"
                style={{ top: headerHeight }}
              />
            </div>

            {/* Discovery Content Based on Mode */}
            {discoveryMode === 'cards' ? (
              <div className="pb-20 -mt-0">
                <SwipeableCreatorCards
                  selectedCategory={selectedFilter}
                  searchQuery={searchQuery}
                  creators={mockCreators.map(creator => ({
                    ...creator,
                    bio: `Passionate ${creator.category} expert with ${creator.ratingsCount} satisfied clients. Available for personalized consultations and advice.`,
                    followers: Math.floor(Math.random() * 1000000) + 10000,
                    sessionHours: Math.floor(Math.random() * 500) + 10,
                    location: creator.name.includes('Stone') ? 'Los Angeles, CA' : 
                             creator.name.includes('Chen') ? 'San Francisco, CA' :
                             creator.name.includes('Johnson') ? 'New York, NY' : 'Austin, TX',
                    isVerified: Math.random() > 0.5,
                    nextAvailable: creator.isOnline ? undefined : 'Tomorrow 2PM'
                  }))}
                  onCreatorLike={handleCreatorLike}
                  onCreatorPass={handleCreatorPass}
                  onCreatorSuperLike={handleCreatorSuperLike}
                  onCreatorMessage={handleCreatorMessage}
                  onCreatorShare={handleCreatorShare}
                  onCreatorBookmark={handleCreatorBookmark}
                />
              </div>
            ) : discoveryMode === 'grid' ? (
              <div className="mx-4 overflow-y-auto pb-20" style={{ height: `calc(100vh - ${headerHeight + 48}px)` }}>
                {/* Live Now Grid - Collapsible */}
                <div className="mb-6">
                  <Collapsible open={liveNowOpen} onOpenChange={setLiveNowOpen}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-0 hover:no-underline">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                        </div>
                        <h3 className="text-lg font-semibold">Live Now</h3>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pt-4">
                        <OnlineCreatorsGrid 
                          selectedCategory={selectedFilter}
                          onCreatorSelect={handleCreatorSelect}
                          searchQuery={searchQuery}
                          hideHeader={true}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            ) : (
              <div className="mx-4 overflow-y-auto pb-20" style={{ height: `calc(100vh - ${headerHeight + 48}px)` }}>
                {/* Schedule in Advance Grid */}
                <div className="mb-6">
                  <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-0 hover:no-underline">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Schedule in advance</h3>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pt-4">
                        <ScheduleCreatorsGrid 
                          selectedCategory={selectedFilter}
                          onCreatorSelect={(id) => setActiveTab("creator-profile")}
                          searchQuery={searchQuery}
                          hideHeader={true}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            )}

            {/* Search and Filters - Moved below results */}
            <div className="mx-4 pb-20">
              {/* Dynamic Sort Options - Based on user's interests from sign-up */}
              <div className="mb-3">
                <UserInterestFilters 
                  selectedFilter={selectedFilter}
                  onFilterChange={setSelectedFilter}
                />
              </div>
              
              {/* Search Bar */}
              <div className="mb-4">
                <IOSSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search creators..."
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveTab("advanced")}
                    className="text-primary font-medium px-0 h-auto underline hover:no-underline"
                  >
                    Creator Matchmaker
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "live":
        return (
          <OnlineCreatorsGrid 
            selectedCategory={selectedFilter}
            onCreatorSelect={handleCreatorSelect}
            searchQuery={searchQuery}
          />
        );

      case "trending":
        return (
          <div className="px-4 pt-4 pb-20 space-y-6">
            <SmartTrendingEngine />
          </div>
        );

      case "advanced":
        return (
          <AdvancedCreatorSearch onBack={() => setActiveTab("discover")} />
        );

      case "following":
        return (
          <div className="px-4 pt-4 pb-20 space-y-6">
            <FanLoyaltyProgram />
            <ActivityFeed />
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
      <div
        style={activeTab === "advanced" ? undefined : { paddingTop: headerHeight }}
      >
        {renderTabContent()}
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