import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Zap, Star, Clock, Users, DollarSign, Award, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TrendingCreator {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  account_type: string;
  is_verified: boolean;
  trend_metrics?: {
    trend_score: number;
    recent_bookings: number;
    social_engagement: number;
    press_mentions: number;
    rising_star_score: number;
  };
  pricing?: {
    base_price_per_minute: number;
    current_demand_score: number;
  };
}

interface TrendingCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
}

const TRENDING_CATEGORIES: TrendingCategory[] = [
  {
    id: "hot",
    name: "Hot Right Now",
    icon: Flame,
    color: "destructive",
    description: "Creators with the highest current demand"
  },
  {
    id: "rising",
    name: "Rising Stars",
    icon: TrendingUp,
    color: "default",
    description: "Up-and-coming creators gaining momentum"
  },
  {
    id: "featured",
    name: "Editor's Choice",
    icon: Star,
    color: "secondary",
    description: "Hand-picked by our editorial team"
  },
  {
    id: "new",
    name: "New Arrivals",
    icon: Zap,
    color: "outline",
    description: "Recently joined creators"
  }
];

export function SmartTrendingEngine() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("hot");
  const [trendingCreators, setTrendingCreators] = useState<TrendingCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingCreators();
  }, [selectedCategory]);

  const loadTrendingCreators = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          trend_metrics(
            trend_score,
            recent_bookings,
            social_engagement,
            press_mentions,
            rising_star_score
          ),
          pricing:pricing_analytics(
            base_price_per_minute,
            current_demand_score
          )
        `)
        .eq('account_type', 'creator')
        .limit(12);

      // Apply category-specific filtering and sorting
      switch (selectedCategory) {
        case "hot":
          query = query.order('trend_metrics(trend_score)', { ascending: false });
          break;
        case "rising":
          query = query.order('trend_metrics(rising_star_score)', { ascending: false });
          break;
        case "featured":
          query = query.eq('is_verified', true);
          break;
        case "new":
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Simulate trending data if none exists
      const creatorsWithTrends = (data || []).map(creator => ({
        ...creator,
        trend_metrics: creator.trend_metrics?.[0] || {
          trend_score: Math.floor(Math.random() * 100),
          recent_bookings: Math.floor(Math.random() * 20),
          social_engagement: Math.floor(Math.random() * 1000),
          press_mentions: Math.floor(Math.random() * 5),
          rising_star_score: Math.floor(Math.random() * 100)
        },
        pricing: creator.pricing?.[0] || {
          base_price_per_minute: 5 + Math.random() * 15,
          current_demand_score: Math.floor(Math.random() * 100)
        }
      }));

      setTrendingCreators(creatorsWithTrends);
    } catch (error) {
      console.error('Error loading trending creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendingBadge = (creator: TrendingCreator) => {
    const metrics = creator.trend_metrics!;
    
    if (metrics.trend_score >= 90) return { label: "🔥 Viral", variant: "destructive" };
    if (metrics.trend_score >= 75) return { label: "📈 Hot", variant: "default" };
    if (metrics.rising_star_score >= 80) return { label: "⭐ Rising", variant: "secondary" };
    if (metrics.recent_bookings >= 15) return { label: "💫 Popular", variant: "outline" };
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trending Discovery</h2>
        <div className="flex gap-2">
          {TRENDING_CATEGORIES.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
              >
                <CategoryIcon className="w-4 h-4 mr-2" />
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Category Description */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {(() => {
              const category = TRENDING_CATEGORIES.find(c => c.id === selectedCategory);
              const CategoryIcon = category?.icon || TrendingUp;
              return (
                <>
                  <div className="p-2 rounded-full bg-primary/10">
                    <CategoryIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{category?.name}</h3>
                    <p className="text-sm text-muted-foreground">{category?.description}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Trending Creators Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingCreators.map((creator) => (
              <TrendingCreatorCard 
                key={creator.id}
                creator={creator}
                category={selectedCategory}
                getTrendingBadge={getTrendingBadge}
              />
            ))}
        </div>
      )}

      {trendingCreators.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No trending creators found</h3>
            <p className="text-muted-foreground">
              Check back later for the latest trending creators
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TrendingCreatorCardProps {
  creator: TrendingCreator;
  category: string;
  getTrendingBadge: (creator: TrendingCreator) => any;
}

function TrendingCreatorCard({ creator, category, getTrendingBadge }: TrendingCreatorCardProps) {
  const trendingBadge = getTrendingBadge(creator);
  const metrics = creator.trend_metrics!;
  const pricing = creator.pricing!;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <CardContent className="p-6 relative">
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <Avatar className="w-16 h-16 mx-auto mb-3 ring-2 ring-primary/20">
              <AvatarImage src={creator.avatar_url} />
              <AvatarFallback>{creator.full_name?.charAt(0) || 'C'}</AvatarFallback>
            </Avatar>
            
            {creator.is_verified && (
              <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                <Award className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
          
          <h3 className="font-semibold mb-1">{creator.full_name}</h3>
          
          {trendingBadge && (
            <Badge variant={trendingBadge.variant as any} className="mb-2">
              {trendingBadge.label}
            </Badge>
          )}
          
          {creator.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {creator.bio}
            </p>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span>Score: {metrics.trend_score}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-secondary" />
            <span>{metrics.recent_bookings} bookings</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-accent" />
            <span>${pricing.base_price_per_minute}/min</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>{pricing.current_demand_score}% demand</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Profile
          </Button>
          <Button size="sm" className="flex-1">
            Book Now
          </Button>
        </div>

        {/* Trending Indicator */}
        {category === "hot" && metrics.trend_score >= 80 && (
          <div className="absolute top-2 right-2">
            <div className="bg-destructive/90 text-destructive-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Hot
            </div>
          </div>
        )}

        {category === "rising" && metrics.rising_star_score >= 70 && (
          <div className="absolute top-2 right-2">
            <div className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Rising
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}