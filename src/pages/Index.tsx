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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Video className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Skip
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/feed")}>
                  <Bell className="h-4 w-4 mr-1" />
                  Feed
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  Profile
                </Button>
              </>
            )}
            {user && profile?.account_type === 'creator' && (
              <Button variant="outline" onClick={() => setActiveTab("creator-dashboard")}>
                Creator Hub
              </Button>
            )}
            {user ? (
              <UserMenu onCreatorDashboard={() => setActiveTab("creator-dashboard")} />
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button variant="gradient" onClick={() => navigate("/auth")}>
                  <Users className="h-4 w-4 mr-1" />
                  Join
                </Button>
              </>
            )}
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

            {/* Live Creators Preview */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Available Now</h2>
                <Button variant="outline" onClick={() => setActiveTab("live")}>
                  View All Live
                </Button>
              </div>
              <OnlineCreators 
                onCreatorSelect={(id) => setActiveTab("creator-profile")}
                onStartCall={(id) => setActiveTab("call")}
              />
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