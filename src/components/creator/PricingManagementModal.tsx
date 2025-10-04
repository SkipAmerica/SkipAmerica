import { useState } from 'react';
import { IOSModal } from '@/components/mobile/IOSModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Sparkles, Zap } from 'lucide-react';
import { MarketRatePricing } from './MarketRatePricing';

interface PricingManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
}

interface PricingTier {
  id?: string;
  duration_minutes: number;
  price_per_block: number;
  is_active: boolean;
  pricing_mode?: 'manual' | 'market_rate';
}

export function PricingManagementModal({
  isOpen,
  onClose,
  creatorId
}: PricingManagementModalProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [tiers, setTiers] = useState<PricingTier[]>([
    { duration_minutes: 5, price_per_block: 25, is_active: true, pricing_mode: 'manual' }
  ]);
  const [speedGreet, setSpeedGreet] = useState({
    enabled: true,
    duration_minutes: 2,
    price_multiplier: 3
  });
  const [autoAccept, setAutoAccept] = useState(false);

  const addTier = () => {
    const nextDuration = Math.max(...tiers.map(t => t.duration_minutes)) + 5;
    setTiers([...tiers, { duration_minutes: nextDuration, price_per_block: 25, is_active: true, pricing_mode: 'manual' }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length > 1) {
      setTiers(tiers.filter((_, i) => i !== index));
    }
  };

  const updateTier = (index: number, field: keyof PricingTier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  return (
    <IOSModal
      open={isOpen}
      onOpenChange={onClose}
      title="Manage Pricing"
      size="full"
    >
      <div className="backdrop-blur-sm bg-gradient-splash min-h-screen">
        <div className="p-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 backdrop-blur-sm bg-white/10 border border-white/30">
              <TabsTrigger 
                value="manual"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
              >
                Manual Pricing
              </TabsTrigger>
              <TabsTrigger 
                value="ai"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI Market Rate
              </TabsTrigger>
            </TabsList>

            {/* Manual Pricing Tab */}
            <TabsContent value="manual" className="space-y-6 mt-6">
              {/* Pricing Tiers */}
              <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6">
                <h3 className="text-white font-semibold mb-4">Pricing Tiers</h3>
                <div className="space-y-4">
                  {tiers.map((tier, index) => (
                    <div key={index} className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/20">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-white/70 text-sm mb-2">Duration (min)</label>
                          <Input
                            type="number"
                            value={tier.duration_minutes}
                            onChange={(e) => updateTier(index, 'duration_minutes', parseInt(e.target.value))}
                            className="backdrop-blur-sm bg-white/5 border-white/20 text-white"
                            min="5"
                            max="120"
                          />
                        </div>
                        <div>
                          <label className="block text-white/70 text-sm mb-2">Price ($)</label>
                          <Input
                            type="number"
                            value={tier.price_per_block}
                            onChange={(e) => updateTier(index, 'price_per_block', parseFloat(e.target.value))}
                            className="backdrop-blur-sm bg-white/5 border-white/20 text-white"
                            min="5"
                            step="5"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-white/70 text-sm mb-2">
                          Price: ${tier.price_per_block}
                        </label>
                        <Slider
                          value={[tier.price_per_block]}
                          onValueChange={(value) => updateTier(index, 'price_per_block', value[0])}
                          min={5}
                          max={200}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tier.is_active}
                            onCheckedChange={(checked) => updateTier(index, 'is_active', checked)}
                          />
                          <span className="text-white text-sm">Active</span>
                          {tier.is_active && (
                            <Badge className="bg-green-500/20 text-green-100 border-green-500/30">
                              Live
                            </Badge>
                          )}
                        </div>
                        {tiers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTier(index)}
                            className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 text-white/70 text-xs">
                        Rate: ${(tier.price_per_block / (tier.duration_minutes / 5)).toFixed(2)} per 5-min block
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={addTier}
                  variant="outline"
                  className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pricing Tier
                </Button>
              </div>

              {/* Speed Greet */}
              <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Speed Greet</h3>
                  </div>
                  <Switch
                    checked={speedGreet.enabled}
                    onCheckedChange={(checked) => setSpeedGreet({ ...speedGreet, enabled: checked })}
                  />
                </div>

                {speedGreet.enabled && (
                  <div className="space-y-4 backdrop-blur-sm bg-white/5 rounded-xl p-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Duration (minutes)</label>
                      <Input
                        type="number"
                        value={speedGreet.duration_minutes}
                        onChange={(e) => setSpeedGreet({ ...speedGreet, duration_minutes: parseInt(e.target.value) })}
                        className="backdrop-blur-sm bg-white/5 border-white/20 text-white"
                        min="1"
                        max="5"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Price Multiplier</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={speedGreet.price_multiplier}
                        onChange={(e) => setSpeedGreet({ ...speedGreet, price_multiplier: parseFloat(e.target.value) })}
                        className="backdrop-blur-sm bg-white/5 border-white/20 text-white"
                        min="1.5"
                        max="10"
                      />
                    </div>
                    {tiers.length > 0 && (
                      <div className="backdrop-blur-sm bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
                        <div className="text-yellow-100 text-sm space-y-1">
                          <div>Standard Rate: ${tiers[0].price_per_block.toFixed(2)}</div>
                          <div className="font-semibold">
                            Speed Greet: ${(tiers[0].price_per_block * speedGreet.price_multiplier * (speedGreet.duration_minutes / 5)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Auto Accept */}
              <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Auto-accept calls</h3>
                    <p className="text-white/70 text-sm mt-1">
                      Automatically accept calls when you're online
                    </p>
                  </div>
                  <Switch
                    checked={autoAccept}
                    onCheckedChange={setAutoAccept}
                  />
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={onClose}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-2xl border border-white/30 p-6">
                <MarketRatePricing
                  creatorId={creatorId}
                  currentPricing={tiers[0] ? {
                    id: tiers[0].id || '',
                    price_per_block: tiers[0].price_per_block,
                    duration_minutes: tiers[0].duration_minutes,
                    pricing_mode: tiers[0].pricing_mode || 'manual'
                  } : undefined}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </IOSModal>
  );
}
