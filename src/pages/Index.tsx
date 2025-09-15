import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, Shield, DollarSign, Clock, Star, Zap, TrendingUp, Bell } from "lucide-react";
import CreatorDashboard from "@/components/CreatorDashboard";
import FanInterface from "@/components/FanInterface";
import VideoCallInterface from "@/components/VideoCallInterface";
import CreatorProfile from "@/components/CreatorProfile";
import OnlineCreators from "@/components/OnlineCreators";
import ActivityFeed from "@/components/ActivityFeed";
import RatingSystem from "@/components/RatingSystem";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

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
              CreatorCall
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setActiveTab("creator-dashboard")}>
              Creator Hub
            </Button>
            <Button variant="gradient">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="following" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Following</span>
            </TabsTrigger>
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
                  Connect with Creators in Real-Time
                </h1>
                <p className="text-lg md:text-xl mb-6 opacity-90">
                  Join live video calls with your favorite creators. Share costs in groups, get instant advice, and build authentic connections.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    variant="hero"
                    onClick={() => setActiveTab("live")}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Explore Live Creators
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={() => setActiveTab("creator-dashboard")}
                  >
                    Become a Creator
                  </Button>
                </div>
              </div>
            </section>

            {/* Live Creators Preview */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Creators Live Now</h2>
                <Button variant="outline" onClick={() => setActiveTab("live")}>
                  View All Live
                </Button>
              </div>
              <OnlineCreators 
                onCreatorSelect={(id) => setActiveTab("creator-profile")}
                onStartCall={(id) => setActiveTab("call")}
              />
            </section>

            {/* Features */}
            <section>
              <h2 className="text-2xl font-bold text-center mb-8">
                How CreatorCall Works
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
              <div className="text-center py-8">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Trending Creators</h3>
                <p className="text-muted-foreground">
                  Discover the most popular creators and trending conversations
                </p>
              </div>
              <OnlineCreators 
                onCreatorSelect={(id) => setActiveTab("creator-profile")}
                onStartCall={(id) => setActiveTab("call")}
              />
            </div>
          </TabsContent>

          <TabsContent value="following">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Following Feed</h3>
                <p className="text-muted-foreground">
                  Stay updated with creators you follow
                </p>
              </div>
              <ActivityFeed showOnlyFollowing={true} />
            </div>
          </TabsContent>
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