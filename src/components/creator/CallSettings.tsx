import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Clock, DollarSign, Settings, Plus, Trash2, Sparkles, AlertCircle, Save, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { MarketRatePricing } from './MarketRatePricing';

interface CallSettingsProps {
  creatorId: string;
}

interface CallPricingTier {
  id?: string;
  duration_minutes: number;
  price_per_block: number;
  is_active: boolean;
  pricing_mode?: 'manual' | 'market_rate';
}

interface SpeedGreetSettings {
  enabled: boolean;
  price_multiplier: number;
  duration_minutes: number;
}

interface MarketRateData {
  suggested_price: number;
  confidence_score: number;
  market_position: string;
}

export function CallSettings({ creatorId }: CallSettingsProps) {
  const [pricingTiers, setPricingTiers] = useState<CallPricingTier[]>([]);
  const [autoAcceptCalls, setAutoAcceptCalls] = useState(false);
  const [speedGreetSettings, setSpeedGreetSettings] = useState<SpeedGreetSettings>({
    enabled: true,
    price_multiplier: 3,
    duration_minutes: 2
  });
  const [marketRateData, setMarketRateData] = useState<MarketRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPricingTiers();
    loadMarketRateData();
  }, [creatorId]);

  const loadPricingTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_call_pricing')
        .select('*')
        .eq('creator_id', creatorId)
        .order('duration_minutes');

      if (error) throw error;

      if (data && data.length > 0) {
        setPricingTiers(data.map(tier => ({
          ...tier,
          pricing_mode: tier.pricing_mode as 'manual' | 'market_rate' || 'manual'
        })));
      } else {
        // Set default single pricing tier (simplified approach)
        setPricingTiers([
          { duration_minutes: 5, price_per_block: 25.00, is_active: true, pricing_mode: 'manual' }
        ]);
      }
    } catch (error) {
      console.error('Error loading pricing tiers:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMarketRateData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-market-rate-analysis', {
        body: { creator_id: creatorId }
      });

      if (error) throw error;
      
      if (data?.suggested_price_per_minute) {
        setMarketRateData({
          suggested_price: data.suggested_price_per_minute * 5, // Convert to 5-minute block
          confidence_score: data.confidence_score || 0.8,
          market_position: data.market_position || 'competitive'
        });
      }
    } catch (error) {
      console.error('Error loading market rate data:', error);
      // Don't show error toast as this is optional data
    }
  };

  const addPricingTier = () => {
    const nextDuration = Math.max(...pricingTiers.map(t => t.duration_minutes)) + 5;
    setPricingTiers([...pricingTiers, { 
      duration_minutes: nextDuration, 
      price_per_block: 25.00, 
      is_active: true,
      pricing_mode: 'manual'
    }]);
  };

  const removePricingTier = (index: number) => {
    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
  };

  const updatePricingTier = (index: number, field: keyof CallPricingTier, value: any) => {
    const updated = [...pricingTiers];
    updated[index] = { ...updated[index], [field]: value };
    setPricingTiers(updated);
  };

  const getPriceSliderColor = (price: number) => {
    if (!marketRateData) return 'hsl(var(--primary))';
    
    const suggested = marketRateData.suggested_price;
    const difference = Math.abs(price - suggested);
    const maxDifference = suggested * 0.5; // 50% difference for full red
    
    // Calculate proximity (0 = far away, 1 = close)
    const proximity = Math.max(0, 1 - (difference / maxDifference));
    
    // Red to green gradient based on proximity
    const red = Math.round(255 * (1 - proximity));
    const green = Math.round(255 * proximity);
    
    return `rgb(${red}, ${green}, 0)`;
  };

  const getPriceIndicator = (price: number) => {
    if (!marketRateData) return null;
    
    const suggested = marketRateData.suggested_price;
    const difference = ((price - suggested) / suggested) * 100;
    
    if (Math.abs(difference) < 10) {
      return { icon: null, text: 'Market Rate', color: 'text-green-600' };
    } else if (difference > 0) {
      return { icon: TrendingUp, text: `${difference.toFixed(0)}% above market`, color: 'text-red-600' };
    } else {
      return { icon: TrendingDown, text: `${Math.abs(difference).toFixed(0)}% below market`, color: 'text-red-600' };
    }
  };

  const savePricingTier = async (tier: CallPricingTier, index: number) => {
    try {
      setIsSaving(true);
      
      const tierData = {
        creator_id: creatorId,
        duration_minutes: tier.duration_minutes,
        price_per_block: tier.price_per_block,
        is_active: tier.is_active,
        pricing_mode: tier.pricing_mode || 'manual'
      };

      if (tier.id) {
        // Update existing tier
        const { error } = await supabase
          .from('creator_call_pricing')
          .update(tierData)
          .eq('id', tier.id);
        
        if (error) throw error;
      } else {
        // Insert new tier
        const { data, error } = await supabase
          .from('creator_call_pricing')
          .insert(tierData)
          .select()
          .single();
          
        if (error) throw error;
        
        // Update local state with the new ID
        const updatedTiers = [...pricingTiers];
        updatedTiers[index] = { ...tier, id: data.id };
        setPricingTiers(updatedTiers);
      }

      toast({
        title: "Settings Saved",
        description: "Pricing tier saved successfully.",
      });
    } catch (error) {
      console.error('Error saving tier:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing tier.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deletePricingTier = async (tierId: string | undefined, index: number) => {
    try {
      if (tierId) {
        const { error } = await supabase
          .from('creator_call_pricing')
          .delete()
          .eq('id', tierId);
          
        if (error) throw error;
      }
      
      removePricingTier(index);
      toast({
        title: "Tier Deleted",
        description: "Pricing tier removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast({
        title: "Error",
        description: "Failed to delete pricing tier.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Pricing</TabsTrigger>
          <TabsTrigger value="market-rate" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>AI Market Rate</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Call Pricing & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Options */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Pricing Options</h3>
                <div className="space-y-4">
                  {pricingTiers.map((tier, index) => (
                    <div key={tier.id || index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <Label htmlFor={`duration-${index}`}>Duration (minutes)</Label>
                          <Input
                            id={`duration-${index}`}
                            type="number"
                            value={tier.duration_minutes}
                            onChange={(e) => updatePricingTier(index, 'duration_minutes', parseInt(e.target.value))}
                            min="5"
                            max="120"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`price-${index}`}>Price ($)</Label>
                            <span className="text-sm font-medium">${tier.price_per_block.toFixed(2)}</span>
                          </div>
                          <div className="space-y-2">
                            <Slider
                              id={`price-${index}`}
                              min={5}
                              max={200}
                              step={5}
                              value={[tier.price_per_block]}
                              onValueChange={(value) => updatePricingTier(index, 'price_per_block', value[0])}
                              className="w-full"
                              style={{
                                '--slider-thumb-color': getPriceSliderColor(tier.price_per_block),
                                '--slider-track-color': getPriceSliderColor(tier.price_per_block)
                              } as React.CSSProperties}
                            />
                            {marketRateData && (
                              <div className="flex items-center gap-1 text-xs">
                                {(() => {
                                  const indicator = getPriceIndicator(tier.price_per_block);
                                  return indicator ? (
                                    <>
                                      {indicator.icon && <indicator.icon className="h-3 w-3" />}
                                      <span className={indicator.color}>{indicator.text}</span>
                                    </>
                                  ) : null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={tier.is_active}
                            onCheckedChange={(checked) => updatePricingTier(index, 'is_active', checked)}
                          />
                          <Label>Active</Label>
                          {tier.is_active && (
                            <Badge variant="secondary">Live</Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => savePricingTier(tier, index)}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          {pricingTiers.length > 1 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deletePricingTier(tier.id, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Rate: ${(tier.price_per_block / (tier.duration_minutes / 5)).toFixed(2)} per 5-min block
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={addPricingTier}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pricing Option
                </Button>
              </div>

              {/* Speed Greet Settings */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Speed Greet Settings
                  </h3>
                  <Switch
                    checked={speedGreetSettings.enabled}
                    onCheckedChange={(enabled) => setSpeedGreetSettings({...speedGreetSettings, enabled})}
                  />
                </div>
                
                {speedGreetSettings.enabled && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="speed-duration">Duration (minutes)</Label>
                        <Input
                          id="speed-duration"
                          type="number"
                          value={speedGreetSettings.duration_minutes}
                          onChange={(e) => setSpeedGreetSettings({
                            ...speedGreetSettings, 
                            duration_minutes: parseInt(e.target.value)
                          })}
                          min="1"
                          max="5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="speed-multiplier">Price Multiplier</Label>
                        <Input
                          id="speed-multiplier"
                          type="number"
                          step="0.5"
                          value={speedGreetSettings.price_multiplier}
                          onChange={(e) => setSpeedGreetSettings({
                            ...speedGreetSettings, 
                            price_multiplier: parseFloat(e.target.value)
                          })}
                          min="1.5"
                          max="10"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded p-3">
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">Speed Greet Pricing Preview</span>
                        </div>
                        {pricingTiers.length > 0 && (
                          <>
                            <div>Standard Rate (5-min): ${pricingTiers[0].price_per_block.toFixed(2)}</div>
                            <div className="font-semibold text-orange-600">
                              Speed Greet Rate: ${(pricingTiers[0].price_per_block * speedGreetSettings.price_multiplier * (speedGreetSettings.duration_minutes / 5)).toFixed(2)} ({speedGreetSettings.duration_minutes} min)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Priority queue access • Instant connection • Premium experience
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {!speedGreetSettings.enabled && (
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Speed Greets are disabled. Enable to offer priority calls to your fans.
                    </p>
                  </div>
                )}
              </div>

              {/* Auto Accept Settings */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Call Management</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-accept calls</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically accept incoming calls when you're online
                    </p>
                  </div>
                  <Switch
                    checked={autoAcceptCalls}
                    onCheckedChange={setAutoAcceptCalls}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market-rate">
          <MarketRatePricing 
            creatorId={creatorId}
            currentPricing={pricingTiers[0] ? {
              id: pricingTiers[0].id || '',
              price_per_block: pricingTiers[0].price_per_block,
              duration_minutes: pricingTiers[0].duration_minutes,
              pricing_mode: pricingTiers[0].pricing_mode || 'manual'
            } : undefined}
            onPricingUpdate={loadPricingTiers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}