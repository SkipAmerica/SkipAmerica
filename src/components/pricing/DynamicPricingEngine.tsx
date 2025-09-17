import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Clock, Users, DollarSign, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PricingData {
  id: string;
  current_demand_score: number;
  base_price_per_minute: number;
  surge_multiplier: number;
  competitor_avg_price: number;
  performance_score: number;
  booking_velocity: number;
  peak_hours: any; // JSON type from database
}

export function DynamicPricingEngine() {
  const { user } = useAuth();
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPricingData();
      // Update pricing every 30 seconds
      const interval = setInterval(updatePricing, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadPricingData = async () => {
    if (!user) return;

    try {
      let { data, error } = await supabase
        .from('pricing_analytics')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No existing data, create initial record
        const { data: newData, error: insertError } = await supabase
          .from('pricing_analytics')
          .insert({
            creator_id: user.id,
            base_price_per_minute: 5.00,
            current_demand_score: Math.floor(Math.random() * 100),
            booking_velocity: Math.floor(Math.random() * 10),
            peak_hours: [9, 10, 11, 19, 20, 21]
          })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newData;
      } else if (error) {
        throw error;
      }

      const processedData = {
        ...data,
        peak_hours: Array.isArray(data.peak_hours) ? data.peak_hours : [9, 10, 11, 19, 20, 21]
      };
      setPricingData(processedData);
      calculateCurrentPrice(processedData);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentPrice = (data: PricingData) => {
    const currentHour = new Date().getHours();
    const isPeakHour = data.peak_hours.includes(currentHour);
    const demandMultiplier = 1 + (data.current_demand_score / 200); // 0.5x to 1.5x
    const peakMultiplier = isPeakHour ? 1.2 : 1.0;
    const performanceMultiplier = 1 + (data.performance_score / 500); // 0.8x to 1.2x
    
    const newPrice = data.base_price_per_minute * 
      demandMultiplier * 
      peakMultiplier * 
      performanceMultiplier;
    
    const oldPrice = currentPrice || newPrice;
    setPriceChange(((newPrice - oldPrice) / oldPrice) * 100);
    setCurrentPrice(newPrice);
  };

  const updatePricing = async () => {
    if (!pricingData || !user) return;

    try {
      // Simulate real-time changes
      const newDemandScore = Math.max(0, Math.min(100, 
        pricingData.current_demand_score + (Math.random() - 0.5) * 20
      ));
      const newBookingVelocity = Math.max(0,
        pricingData.booking_velocity + Math.floor((Math.random() - 0.5) * 4)
      );

      const { data: updatedData, error } = await supabase
        .from('pricing_analytics')
        .update({
          current_demand_score: newDemandScore,
          booking_velocity: newBookingVelocity,
          surge_multiplier: 1 + (newDemandScore / 200)
        })
        .eq('creator_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const processedData = {
        ...updatedData,
        peak_hours: Array.isArray(updatedData.peak_hours) ? updatedData.peak_hours : [9, 10, 11, 19, 20, 21]
      };
      setPricingData(processedData);
      calculateCurrentPrice(processedData);
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const getDemandStatus = (score: number) => {
    if (score >= 80) return { label: "Very High", color: "destructive", icon: TrendingUp };
    if (score >= 60) return { label: "High", color: "default", icon: TrendingUp };
    if (score >= 40) return { label: "Moderate", color: "secondary", icon: Clock };
    if (score >= 20) return { label: "Low", color: "outline", icon: TrendingDown };
    return { label: "Very Low", color: "outline", icon: TrendingDown };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pricingData) return null;

  const demandStatus = getDemandStatus(pricingData.current_demand_score);
  const DemandIcon = demandStatus.icon;

  return (
    <div className="space-y-6">
      {/* Current Pricing Display */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Dynamic Pricing Engine
            <Badge variant="outline" className="ml-auto">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              ${currentPrice.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">/min</span>
            </div>
            {priceChange !== 0 && (
              <div className={`flex items-center justify-center gap-1 text-sm ${
                priceChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {priceChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(priceChange).toFixed(1)}% from last update
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <DemandIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">Demand</div>
              <Badge variant={demandStatus.color as any} className="mt-1">
                {demandStatus.label}
              </Badge>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">Booking Rate</div>
              <div className="text-lg font-bold">{pricingData.booking_velocity}/hr</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">Base Rate</div>
              <div className="text-lg font-bold">${pricingData.base_price_per_minute}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">Performance</div>
              <div className="text-lg font-bold">{pricingData.performance_score}/100</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Demand</span>
                <span className="text-sm text-muted-foreground">
                  {pricingData.current_demand_score}/100
                </span>
              </div>
              <Progress value={pricingData.current_demand_score} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Performance Score</span>
                <span className="text-sm text-muted-foreground">
                  {pricingData.performance_score}/100
                </span>
              </div>
              <Progress value={pricingData.performance_score} className="h-2" />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Peak Hours</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from({length: 24}, (_, i) => {
                const isPeak = pricingData.peak_hours.includes(i);
                const currentHour = new Date().getHours();
                const isCurrent = i === currentHour;
                
                return (
                  <Badge 
                    key={i} 
                    variant={isPeak ? (isCurrent ? "default" : "secondary") : "outline"}
                    className={isCurrent ? "ring-2 ring-primary" : ""}
                  >
                    {i.toString().padStart(2, '0')}:00
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitive Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Market Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Your Current Rate</span>
            <span className="font-bold">${currentPrice.toFixed(2)}/min</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Market Average</span>
            <span className="text-muted-foreground">${pricingData.competitor_avg_price}/min</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Competitive Position</span>
            <Badge variant={currentPrice > pricingData.competitor_avg_price ? "default" : "secondary"}>
              {currentPrice > pricingData.competitor_avg_price ? "Premium" : "Competitive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}