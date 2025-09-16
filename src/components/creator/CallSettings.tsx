import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Clock, DollarSign, Settings, Plus, Trash2, Sparkles, AlertCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

export function CallSettings({ creatorId }: CallSettingsProps) {
  const [pricingTiers, setPricingTiers] = useState<CallPricingTier[]>([]);
  const [autoAcceptCalls, setAutoAcceptCalls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPricingTiers();
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
        // Set default pricing tiers if none exist
        setPricingTiers([
          { duration_minutes: 5, price_per_block: 25.00, is_active: true, pricing_mode: 'manual' },
          { duration_minutes: 10, price_per_block: 45.00, is_active: true, pricing_mode: 'manual' },
          { duration_minutes: 15, price_per_block: 65.00, is_active: true, pricing_mode: 'manual' }
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

  const addPricingTier = () => {
    setPricingTiers([...pricingTiers, { 
      duration_minutes: 30, 
      price_per_block: 60.00, 
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
                        <div>
                          <Label htmlFor={`price-${index}`}>Price ($)</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            step="0.01"
                            value={tier.price_per_block}
                            onChange={(e) => updatePricingTier(index, 'price_per_block', parseFloat(e.target.value))}
                            min="1"
                          />
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
                        Rate: ${(tier.price_per_block / tier.duration_minutes).toFixed(2)}/minute
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
                <h3 className="text-lg font-semibold mb-4">Speed Greet Settings</h3>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Speed Greet Premium Feature</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Speed Greets are priority 2-minute calls that allow fans to skip the queue at a premium rate.
                    The price is automatically calculated at 3x your standard per-minute rate.
                  </p>
                  
                  {pricingTiers.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-3">
                      <div className="text-sm space-y-1">
                        <div>Standard Rate: ${(pricingTiers[0].price_per_block / pricingTiers[0].duration_minutes).toFixed(2)}/min</div>
                        <div className="font-semibold text-orange-600">
                          Speed Greet Rate: ${((pricingTiers[0].price_per_block / pricingTiers[0].duration_minutes) * 3).toFixed(2)}/min
                        </div>
                        <div className="font-bold">
                          Speed Greet Price: ${((pricingTiers[0].price_per_block / pricingTiers[0].duration_minutes) * 3 * 2).toFixed(2)} (2 minutes)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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