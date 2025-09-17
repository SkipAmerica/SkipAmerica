import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, Gift, TrendingUp, Users, DollarSign, Award, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LoyaltyData {
  id: string;
  fan_id: string;
  creator_id: string;
  total_spent: number;
  tier_level: number;
  points: number;
  last_interaction: string;
  creator?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface TierInfo {
  level: number;
  name: string;
  color: string;
  icon: any;
  minSpent: number;
  benefits: string[];
  pointsMultiplier: number;
}

const LOYALTY_TIERS: TierInfo[] = [
  {
    level: 1,
    name: "Fan",
    color: "secondary",
    icon: Users,
    minSpent: 0,
    benefits: ["Basic access", "Standard support"],
    pointsMultiplier: 1
  },
  {
    level: 2,
    name: "Super Fan",
    color: "default",
    icon: Star,
    minSpent: 100,
    benefits: ["Priority booking", "5% session discount", "Exclusive content access"],
    pointsMultiplier: 1.5
  },
  {
    level: 3,
    name: "VIP",
    color: "destructive",
    icon: Crown,
    minSpent: 500,
    benefits: ["Skip waiting lists", "10% session discount", "Monthly exclusive calls", "Direct messaging"],
    pointsMultiplier: 2
  },
  {
    level: 4,
    name: "Elite",
    color: "outline",
    icon: Award,
    minSpent: 1000,
    benefits: ["Guaranteed bookings", "15% session discount", "Personal assistant", "Event invites", "Merchandise"],
    pointsMultiplier: 3
  }
];

export function FanLoyaltyProgram() {
  const { user } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLoyaltyData();
    }
  }, [user]);

  const loadLoyaltyData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fan_loyalty')
        .select(`
          *,
          creator:profiles!fan_loyalty_creator_id_fkey(full_name, avatar_url)
        `)
        .eq('fan_id', user.id)
        .order('total_spent', { ascending: false });

      if (error) throw error;

      setLoyaltyData(data || []);
      setTotalPoints(data?.reduce((sum, item) => sum + item.points, 0) || 0);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (level: number): TierInfo => {
    return LOYALTY_TIERS.find(tier => tier.level === level) || LOYALTY_TIERS[0];
  };

  const getNextTier = (currentSpent: number): TierInfo | null => {
    return LOYALTY_TIERS.find(tier => tier.minSpent > currentSpent) || null;
  };

  const calculateProgressToNextTier = (currentSpent: number, currentTier: number): number => {
    const nextTier = LOYALTY_TIERS.find(tier => tier.level === currentTier + 1);
    if (!nextTier) return 100;
    
    const prevTier = LOYALTY_TIERS.find(tier => tier.level === currentTier);
    const prevTierMin = prevTier?.minSpent || 0;
    
    const progress = ((currentSpent - prevTierMin) / (nextTier.minSpent - prevTierMin)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Loyalty Dashboard</h2>
              <p className="text-muted-foreground">Your status across all creators</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{totalPoints.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Creator Loyalty Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Creator Relationships</h3>
        
        {loyaltyData.length > 0 ? (
          <div className="grid gap-4">
            {loyaltyData.map((loyalty) => (
              <CreatorLoyaltyCard key={loyalty.id} loyalty={loyalty} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Start Building Loyalty</h3>
              <p className="text-muted-foreground mb-4">
                Book sessions with creators to earn points and unlock rewards
              </p>
              <Button>Explore Creators</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tier Benefits Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Loyalty Tiers & Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {LOYALTY_TIERS.map((tier) => {
              const TierIcon = tier.icon;
              return (
                <div key={tier.level} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <TierIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{tier.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ${tier.minSpent}+ spent
                      </p>
                    </div>
                    <Badge variant={tier.color as any} className="ml-auto">
                      {tier.pointsMultiplier}x points
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Zap className="w-3 h-3 text-primary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CreatorLoyaltyCardProps {
  loyalty: LoyaltyData;
}

function CreatorLoyaltyCard({ loyalty }: CreatorLoyaltyCardProps) {
  const currentTier = getTierInfo(loyalty.tier_level);
  const nextTier = getNextTier(loyalty.total_spent);
  const progress = calculateProgressToNextTier(loyalty.total_spent, loyalty.tier_level);
  
  const TierIcon = currentTier.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={loyalty.creator?.avatar_url} />
            <AvatarFallback>
              {loyalty.creator?.full_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{loyalty.creator?.full_name || 'Creator'}</h3>
              <Badge variant={currentTier.color as any} className="flex items-center gap-1">
                <TierIcon className="w-3 h-3" />
                {currentTier.name}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">${loyalty.total_spent}</div>
                <div className="text-xs text-muted-foreground">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{loyalty.points}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">Level {loyalty.tier_level}</div>
                <div className="text-xs text-muted-foreground">Current Tier</div>
              </div>
            </div>

            {nextTier && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress to {nextTier.name}</span>
                  <span className="text-muted-foreground">
                    ${loyalty.total_spent} / ${nextTier.minSpent}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  ${nextTier.minSpent - loyalty.total_spent} more to unlock {nextTier.name} benefits
                </div>
              </div>
            )}

            {!nextTier && (
              <div className="text-center py-2">
                <Badge variant="outline" className="text-primary">
                  <Crown className="w-3 h-3 mr-1" />
                  Max Tier Achieved!
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Last interaction: {new Date(loyalty.last_interaction).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View Benefits
              </Button>
              <Button size="sm">
                Book Session
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}