import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Clock, DollarSign, Settings, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CallSettingsProps {
  creatorId: string;
}

interface CallPricingTier {
  id?: string;
  duration_minutes: number;
  price_per_block: number;
  is_active: boolean;
}

export function CallSettings({ creatorId }: CallSettingsProps) {
  const [pricingTiers, setPricingTiers] = useState<CallPricingTier[]>([]);
  const [autoAcceptCalls, setAutoAcceptCalls] = useState(false);
  const [loading, setLoading] = useState(true);
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
        .eq('is_active', true)
        .order('duration_minutes');

      if (error) throw error;

      if (data && data.length > 0) {
        setPricingTiers(data);
      } else {
        // Set default pricing tiers if none exist
        setPricingTiers([
          { duration_minutes: 5, price_per_block: 25.00, is_active: true },
          { duration_minutes: 10, price_per_block: 45.00, is_active: true },
          { duration_minutes: 15, price_per_block: 65.00, is_active: true }
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
      is_active: true 
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

  const handleSaveSettings = async () => {
    try {
      setLoading(true);

      // Delete existing pricing tiers
      const { error: deleteError } = await supabase
        .from('creator_call_pricing')
        .delete()
        .eq('creator_id', creatorId);

      if (deleteError) throw deleteError;

      // Insert new pricing tiers
      const tiersToInsert = pricingTiers.map(tier => ({
        creator_id: creatorId,
        duration_minutes: tier.duration_minutes,
        price_per_block: tier.price_per_block,
        is_active: tier.is_active
      }));

      const { error: insertError } = await supabase
        .from('creator_call_pricing')
        .insert(tiersToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Settings Saved",
        description: "Your call pricing has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Call Time Blocks & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Your Call Packages</Label>
              <Button onClick={addPricingTier} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </div>
            
            <div className="space-y-3">
              {pricingTiers.map((tier, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Minutes"
                      value={tier.duration_minutes}
                      onChange={(e) => updatePricingTier(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                      className="w-20"
                      min="1"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={tier.price_per_block}
                      onChange={(e) => updatePricingTier(index, 'price_per_block', parseFloat(e.target.value) || 0)}
                      className="w-24"
                      min="0"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={tier.is_active}
                      onCheckedChange={(checked) => updatePricingTier(index, 'is_active', checked)}
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                  
                  {pricingTiers.length > 1 && (
                    <Button
                      onClick={() => removePricingTier(index)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Fans can purchase these time blocks for calls with you. Each package is a separate purchase.
            </p>
          </div>

          {/* Auto Accept Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Call Management</Label>
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

          <div className="pt-4 border-t">
            <Button onClick={handleSaveSettings} className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Call Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pricingTiers.filter(tier => tier.is_active).map((tier, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">
                  {tier.duration_minutes} minute{tier.duration_minutes !== 1 ? 's' : ''}
                </span>
                <span className="text-sm font-medium">
                  ${tier.price_per_block.toFixed(2)}
                </span>
              </div>
            ))}
            {pricingTiers.filter(tier => tier.is_active).length === 0 && (
              <p className="text-sm text-muted-foreground">No active packages</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}