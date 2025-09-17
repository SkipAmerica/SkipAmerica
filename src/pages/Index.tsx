import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Shield, DollarSign, Clock, Star, Zap, TrendingUp, Bell, Search, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { UserMenu } from "@/components/UserMenu";
import CreatorDashboard from "@/components/CreatorDashboard";
import FanInterface from "@/components/FanInterface";
import VideoCallInterface from "@/components/VideoCallInterface";
import CreatorProfile from "@/components/CreatorProfile";
import OnlineCreators from "@/components/OnlineCreators";
import ActivityFeed from "@/components/ActivityFeed";
import RatingSystem from "@/components/RatingSystem";
import { InfluentialPeopleSearch } from "@/components/discovery/InfluentialPeopleSearch";
import { EventCountdown } from "@/components/events/EventCountdown";
import { AdBanner } from "@/components/ads/AdBanner";
import { FeatureDemo } from "@/components/demo/FeatureDemo";
import { CreatorEconomyShowcase } from "@/components/demo/CreatorEconomyShowcase";
import { UserInterestFilters } from "@/components/UserInterestFilters";
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

const Index = () => {
  console.log('Index page is rendering...');
  const [activeTab, setActiveTab] = useState("discover");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

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
            <div className="mx-4 space-y-4">
              {/* Dynamic Sort Options - Based on user's interests from sign-up */}
              <UserInterestFilters />
              
              {/* Search Bar */}
              <div>
                <IOSSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search creators..."
                />
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
          <div className="px-4 pt-4 pb-20">
            <AdvancedCreatorSearch />
          </div>
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

  // Main iOS interface
  return (
    <div className="min-h-screen bg-background relative">
      {/* iOS Navigation Bar */}
      {user ? (
        <IOSInstagramHeader 
          onMenuClick={() => setShowMenu(true)}
          onCreatorSelect={(id) => setActiveTab("creator-profile")}
        />
      ) : (
        <IOSNavBar
          title={
            activeTab === "discover" ? "Skip" :
            activeTab === "live" ? "Live Now" :
            activeTab === "trending" ? "Trending" :
            activeTab === "advanced" ? "Search" :
            activeTab === "following" ? "Following" : "Skip"
          }
          rightButton={{
            text: "Sign In",
            onClick: () => navigate("/auth")
          }}
        />
      )}

      {/* Search Bar - Show when in advanced tab */}
      {activeTab === "advanced" && (
        <div className={`fixed ${user ? 'top-28' : 'top-[var(--ios-nav-bar-height)]'} left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 p-4`}>
          <IOSSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search creators..."
          />
        </div>
      )}

      {/* Main Content */}
      <div className={`${
        activeTab === "advanced" 
          ? (user ? "pt-36" : "pt-24")
          : (user ? "pt-40" : "pt-[var(--ios-nav-bar-height)]")
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