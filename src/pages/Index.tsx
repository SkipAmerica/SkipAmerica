import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, Shield, DollarSign, Clock, Star, Zap, TrendingUp, Bell } from "lucide-react";
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
import { CreatorCard } from "@/components/ui/creator-card";
import { MobileNavigation } from "@/components/mobile/MobileNavigation";
import heroImage from "@/assets/hero-image.jpg";

import { SmartTrendingEngine } from "@/components/discovery/SmartTrendingEngine";
import { FanLoyaltyProgram } from "@/components/loyalty/FanLoyaltyProgram";

const Index = () => {
  console.log('Index page is rendering...');
  const [activeTab, setActiveTab] = useState("home");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  // Handle different views
  if (activeTab === "creator-dashboard") {
    return <CreatorDashboard onBack={() => setActiveTab("home")} />;
  }

  if (activeTab === "fan-interface") {
    return <FanInterface onBack={() => setActiveTab("home")} />;
  }

  if (activeTab === "call") {
    return <VideoCallInterface onBack={() => setActiveTab("home")} />;
  }

  if (activeTab === "creator-profile") {
    return (
      <CreatorProfile 
        onBack={() => setActiveTab("home")} 
        onStartCall={() => setActiveTab("call")}
      />
    );
  }

  // Main social media interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 pb-20">
      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-40 bg-gradient-hero text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Video className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">
                GoLive
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {user ? (
                <UserMenu onCreatorDashboard={() => setActiveTab("creator-dashboard")} />
              ) : (
                <Button variant="hero-outline" size="sm" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
          
          {/* Creator avatars row - OSMO style */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {["Wealth Coach", "Business", "Tech Expert", "Designer"].map((title, index) => (
                <div key={index} className="flex flex-col items-center min-w-0">
                  <div className="relative mb-1">
                    <div className="w-12 h-12 relative">
                      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
                        <defs>
                          <clipPath id={`header-hex-${index}`}>
                            <polygon points="50,5 85,25 85,75 50,95 15,75 15,25" />
                          </clipPath>
                        </defs>
                      </svg>
                      <div 
                        className="w-full h-full bg-white/90 rounded-lg flex items-center justify-center"
                        style={{ clipPath: `url(#header-hex-${index})` }}
                      >
                        <span className="text-lg">👤</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-white/90 text-center">{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className={`grid w-full ${user ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="discover" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Discover</span>
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Live Now</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Trending</span>
            </TabsTrigger>
            <TabsTrigger value="platform" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Platform</span>
            </TabsTrigger>
            {user && (
              <TabsTrigger value="following" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Following</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="discover" className="space-y-8">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-hero text-primary-foreground p-8 md:p-12">
              <div className="absolute inset-0 opacity-20">
                <img 
                  src={heroImage} 
                  alt="Creators connecting with fans through video calls" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10 max-w-3xl">
                <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  Live Social Network
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Break Through to Influential People
                </h1>
                <p className="text-lg md:text-xl mb-8 opacity-90">
                  Connect directly with celebrities, experts, entrepreneurs, and influencers. Skip the barriers and get real access.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {user ? (
                    <Button 
                      size="lg" 
                      variant="hero"
                      onClick={() => setActiveTab("live")}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Explore Live Now
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="lg" 
                        variant="hero"
                        className="text-lg px-8 py-4"
                        onClick={() => navigate("/auth")}
                      >
                        <Users className="mr-2 h-5 w-5" />
                        Join Skip - It's Free!
                      </Button>
                      <Button 
                        size="lg" 
                        variant="hero-outline"
                        onClick={() => setActiveTab("live")}
                      >
                      <Zap className="mr-2 h-4 w-4" />
                      Browse Talent
                      </Button>
                    </>
                  )}
                </div>
                {!user && (
                  <p className="text-sm opacity-75 mt-4">
                    Connect with the people you've always wanted to meet.
                  </p>
                )}
              </div>
            </section>

            {/* OSMO-style Creator Cards */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Featured Creators</h2>
                <Button variant="outline" onClick={() => setActiveTab("live")}>
                  View All Live
                </Button>
              </div>
              
              {/* Sample OSMO-style creator cards */}
              <div className="space-y-4">
                <CreatorCard 
                  creator={{
                    id: "1",
                    name: "Sonia Booker",
                    category: "Finance",
                    expertise: "Wealth",
                    isVerified: true,
                    title: "Women are building wealth and legacies...",
                    description: "Sonia Booker thinks wealth building should be fun, as well as rewarding, and will introduce twelve women...",
                    contentType: "BLOG",
                    avatar: "/api/placeholder/64/64"
                  }}
                />
                
                <CreatorCard 
                  creator={{
                    id: "2", 
                    name: "Arianna Huffington",
                    category: "Business",
                    expertise: "Leadership",
                    isVerified: true,
                    title: "Donald The Dementor: How 'Harry Potter' Explains Trump's Destructive Power",
                    description: "Long before Donald Trump became the most dangerous, unstable, and unqualified presidential nominee...",
                    contentType: "LINK",
                    avatar: "/api/placeholder/64/64"
                  }}
                />

                <CreatorCard 
                  creator={{
                    id: "3",
                    name: "Woody Martin", 
                    category: "Branding",
                    expertise: "Graphic Design",
                    title: "Developing A Powerful Brand Purpose",
                    description: "A sizzling brand purpose sets out how a company intends to change the world for the better.",
                    contentType: "PODCAST",
                    image: "/api/placeholder/400/200",
                    avatar: "/api/placeholder/64/64"
                  }}
                />
              </div>
            </section>

            {/* Sponsored Content */}
            <section>
              <AdBanner placement="banner" />
            </section>

            {/* Upcoming Events */}
            <section>
              <EventCountdown />
            </section>

            {/* New Features Demo */}
            <section>
              <FeatureDemo />
            </section>

            {/* Features */}
            <section>
                <h2 className="text-2xl font-bold text-center mb-8">
                  Break Through Traditional Barriers
                </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="shadow-creator hover:shadow-glow transition-all duration-300">
                  <CardHeader>
                    <DollarSign className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Fair Pricing</CardTitle>
                    <CardDescription>
                      Per-minute pricing that splits with group size. More participants = lower cost for everyone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-accent p-4 rounded-lg">
                      <div className="text-sm text-accent-foreground">
                        <div className="flex justify-between mb-1">
                          <span>1 person:</span>
                          <span className="font-bold">$5/min</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>4 people:</span>
                          <span className="font-bold">$1.25/min each</span>
                        </div>
                        <div className="flex justify-between">
                          <span>10 people:</span>
                          <span className="font-bold">$0.50/min each</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-creator hover:shadow-glow transition-all duration-300">
                  <CardHeader>
                    <Star className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Trust & Safety</CardTitle>
                    <CardDescription>
                      Dual rating system for creators and fans. Content moderation keeps conversations respectful.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Creator ratings</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Fan ratings</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Auto-moderation + reporting system
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-creator hover:shadow-glow transition-all duration-300">
                  <CardHeader>
                    <Zap className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Instant Connection</CardTitle>
                    <CardDescription>
                      See who's online and available. Join calls instantly or schedule for later.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm">Live indicators</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Response times</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Group calls</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Activity Feed Preview */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recent Activity</h2>
                <Button variant="outline" onClick={() => setActiveTab("following")}>
                  View Full Feed
                </Button>
              </div>
              <div className="grid gap-4">
                <ActivityFeed />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="live">
            <OnlineCreators 
              onCreatorSelect={(id) => setActiveTab("creator-profile")}
              onStartCall={(id) => setActiveTab("call")}
            />
          </TabsContent>

          <TabsContent value="trending">
            <div className="space-y-6">
              <SmartTrendingEngine />
            </div>
          </TabsContent>

          <TabsContent value="platform">
            <CreatorEconomyShowcase />
          </TabsContent>

          {user && (
            <TabsContent value="following">
              <div className="space-y-6">
                <FanLoyaltyProgram />
                <div className="text-center py-8">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Following Feed</h3>
                  <p className="text-muted-foreground">
                    Stay updated with people you follow
                  </p>
                </div>
                <ActivityFeed showOnlyFollowing={true} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Mobile Navigation - OSMO Style */}
      <MobileNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile ? { name: profile.full_name || 'User', avatar: profile.avatar_url } : undefined}
        unreadMessages={3}
      />

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingSystem
          isCreator={false}
          targetName="Emma Wilson"
          targetAvatar="EW"
          onRatingSubmit={(rating, comment, tags) => {
            console.log('Rating submitted:', { rating, comment, tags });
            setShowRatingModal(false);
          }}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
};

export default Index;