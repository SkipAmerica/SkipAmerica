import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Zap, 
  Crown, 
  Star, 
  Gift, 
  Calendar,
  Music,
  Share2,
  Target,
  Award
} from "lucide-react";

export function CreatorEconomyShowcase() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
          🚀 Skip Creator Economy Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Advanced algorithms, trending discovery, loyalty programs, and collaborative features - all integrated and live!
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dynamic Pricing Engine */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Dynamic Pricing Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">$7.42/min</div>
              <div className="text-sm text-muted-foreground">Current Rate</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Demand Score</span>
                <span>78%</span>
              </div>
              <Progress value={78} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Performance Score</span>
                <span>85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="flex justify-between items-center text-xs">
              <Badge variant="default">High Demand</Badge>
              <Badge variant="outline">Peak Hours</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Smart Trending */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-orange/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-destructive" />
              Smart Trending
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">🔥 Viral Creators</span>
                <Badge variant="destructive">12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">⭐ Rising Stars</span>
                <Badge variant="secondary">28</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">📈 Trending Score</span>
                <Badge variant="outline">94/100</Badge>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">47K</div>
              <div className="text-sm text-muted-foreground">Discovery Views</div>
            </div>
          </CardContent>
        </Card>

        {/* Fan Loyalty Program */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-accent/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-secondary" />
              Loyalty Program
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xl font-bold">VIP</div>
                <div className="text-xs text-muted-foreground">Tier 3</div>
              </div>
              <div>
                <div className="text-xl font-bold">2,450</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Elite</span>
                <span>73%</span>
              </div>
              <Progress value={73} className="h-2" />
            </div>
            <div className="flex gap-1">
              <Badge variant="outline" className="text-2xs">10% Discount</Badge>
              <Badge variant="outline" className="text-2xs">Skip Queue</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Creator Playlists */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-accent" />
              Content Playlists
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">⭐ Featured Playlists</span>
                <Badge>8</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">🎵 Total Collections</span>
                <Badge variant="secondary">23</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">👀 Total Views</span>
                <Badge variant="outline">12.5K</Badge>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">89%</div>
              <div className="text-sm text-muted-foreground">Engagement Rate</div>
            </div>
          </CardContent>
        </Card>

        {/* Referral System */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-green-600" />
              Referral Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$847</div>
              <div className="text-sm text-muted-foreground">Referral Earnings</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-lg font-bold">34</div>
                <div className="text-xs text-muted-foreground">Referrals</div>
              </div>
              <div>
                <div className="text-lg font-bold">10%</div>
                <div className="text-xs text-muted-foreground">Commission</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Goal</span>
                <span>17/20</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Collaborative Events */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Live Events
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">🎪 Active Events</span>
                <Badge variant="default">5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">👥 Collaborators</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">💰 Revenue Split</span>
                <Badge variant="outline">Auto</Badge>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">$2,340</div>
              <div className="text-sm text-muted-foreground">Event Revenue</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">$127K</div>
              <div className="text-sm text-muted-foreground">Total Creator Earnings</div>
              <div className="text-xs text-green-600 mt-1">↗ +23% this month</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary mb-2">8,420</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
              <div className="text-xs text-green-600 mt-1">↗ +15% this week</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">456</div>
              <div className="text-sm text-muted-foreground">Live Sessions Today</div>
              <div className="text-xs text-green-600 mt-1">↗ Peak activity</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive mb-2">94.8%</div>
              <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              <div className="text-xs text-green-600 mt-1">↗ All-time high</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">✨ All Features Live & Integrated</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Real-time Pricing</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Smart Discovery</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium">Loyalty Rewards</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium">Creator Collaboration</span>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold mb-4">The Future of Creator Economy is Here</h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Advanced algorithms, personalized discovery, loyalty programs, and collaborative tools working together to create the ultimate creator-fan connection platform.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" className="bg-gradient-primary">
            Explore Creator Dashboard
          </Button>
          <Button size="lg" variant="outline">
            Discover Trending Creators
          </Button>
        </div>
      </div>
    </div>
  );
}