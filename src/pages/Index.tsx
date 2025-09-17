import { useState } from "react";
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
  { id: '1', name: 'Emma Stone', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150', category: 'entertainment', isOnline: true, ratingsCount: 1240, rating: 4.9, title: 'Academy Award Winner', callRate: 150, maxCallDuration: 30 },
  { id: '2', name: 'Dr. Sarah Chen', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', category: 'technology', isOnline: true, ratingsCount: 890, rating: 4.8, title: 'AI Research Director', callRate: 200, maxCallDuration: 45 },
  { id: '3', name: 'Marcus Johnson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', category: 'business', isOnline: true, ratingsCount: 650, rating: 4.7, title: 'Serial Entrepreneur', callRate: 300, maxCallDuration: 60 },
  { id: '4', name: 'Zoe Rodriguez', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', category: 'beauty', isOnline: true, ratingsCount: 2100, rating: 4.9, title: 'Beauty Influencer', callRate: 100, maxCallDuration: 20 },
  { id: '5', name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', category: 'technology', isOnline: true, ratingsCount: 420, rating: 4.6, title: 'Lead Developer', callRate: 180, maxCallDuration: 40 },
  { id: '6', name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', category: 'entertainment', isOnline: true, ratingsCount: 1560, rating: 4.8, title: 'Grammy Nominee', callRate: 250, maxCallDuration: 35 },
];

const Index = () => {
  console.log('Index page is rendering...');
  const [activeTab, setActiveTab] = useState("discover");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [liveNowOpen, setLiveNowOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

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


            {/* Search and Filters */}
            <div className="mx-4">
              {/* Dynamic Sort Options - Based on user's interests from sign-up */}
              <div className="mb-3 pt-3">
                <UserInterestFilters 
                  selectedFilter={selectedFilter}
                  onFilterChange={setSelectedFilter}
                />
              </div>
              
              {/* Search Bar */}
              <div className="mb-6">
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

              {/* Schedule in Advance Grid - Collapsible */}
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

            {/* Features - Mobile Cards */}
            <IOSListView className="mx-4">
              <IOSListSection header="Monetize Your Following">
                <IOSListItem chevron onClick={() => {}}>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">Direct Revenue Stream</div>
                      <div className="text-sm text-muted-foreground">
                        Set your rate, start earning per minute
                      </div>
                    </div>
                  </div>
                </IOSListItem>
                <IOSListItem chevron onClick={() => {}}>
                  <div className="flex items-center space-x-3">
                    <Star className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">Professional Protection</div>
                      <div className="text-sm text-muted-foreground">
                        Secure payments & content moderation
                      </div>
                    </div>
                  </div>
                </IOSListItem>
                <IOSListItem chevron onClick={() => {}}>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">Easy Integration</div>
                      <div className="text-sm text-muted-foreground">
                        Works with your existing social presence
                      </div>
                    </div>
                  </div>
                </IOSListItem>
              </IOSListSection>
            </IOSListView>

            {/* Sponsored Content */}
            <div className="mx-4">
              <AdBanner placement="banner" />
            </div>

            {/* Activity Feed Preview */}
            <div className="mx-4 pb-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recent Activity</h2>
                <Button variant="outline" size="sm" onClick={() => user && setActiveTab("following")}>
                  View Full Feed
                </Button>
              </div>
              <ActivityFeed />
            </div>
          </div>
        );

      case "live":
        return (
          <div className="px-4 pt-4 pb-20">
            <OnlineCreators 
              onCreatorSelect={(id) => setActiveTab("creator-profile")}
              onStartCall={(id) => setActiveTab("call")}
            />
          </div>
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

  // Show signed out experience
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-white">
        {/* Skip Logo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">Skip</h1>
          <p className="text-xl text-gray-300 mb-8">
            Connect with creators and experts instantly
          </p>
        </div>

        {/* Hero Content */}
        <div className="text-center max-w-md mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Monetize Your Following
          </h2>
          <p className="text-gray-300 mb-6">
            Set your rate, start earning per minute. Professional protection with secure payments & content moderation.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-primary" />
              <span>Direct Revenue Stream</span>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-primary" />
              <span>Professional Protection</span>
            </div>
            <div className="flex items-center space-x-3">
              <Zap className="h-6 w-6 text-primary" />
              <span>Easy Integration</span>
            </div>
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="w-full max-w-sm space-y-4">
          <Button 
            className="w-full bg-white text-black hover:bg-gray-100"
            onClick={() => navigate("/auth")}
          >
            Sign Up
          </Button>
          <Button 
            className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
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
      <div className={`${
        activeTab === "advanced" ? "" : "pt-40"
      }`}>
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