import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Eye,
  UserCheck,
  Calculator,
  Crown
} from 'lucide-react';

interface GroupPricingProps {
  creatorId: string;
  basePrice: number; // 1-on-1 price per hour
  isCreator: boolean;
}

interface PricingTier {
  participants: number;
  pricePerPerson: number;
  totalRevenue: number;
  revenueMultiplier: number;
}

// Dynamic pricing algorithm
const calculateGroupPricing = (basePrice: number, participants: number): PricingTier => {
  // Revenue multiplier increases with group size but individual cost decreases
  const revenueMultiplier = 1 + (participants - 1) * 0.4; // 40% more revenue per additional person
  const totalRevenue = basePrice * revenueMultiplier;
  const pricePerPerson = totalRevenue / participants;
  
  return {
    participants,
    pricePerPerson: Math.round(pricePerPerson * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueMultiplier: Math.round(revenueMultiplier * 100) / 100
  };
};

export function GroupCallPricing({ creatorId, basePrice, isCreator }: GroupPricingProps) {
  const { user } = useAuth();
  const [groupCallsEnabled, setGroupCallsEnabled] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState([8]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(3);
  const [loading, setLoading] = useState(false);

  const pricingTiers: PricingTier[] = [];
  for (let i = 1; i <= maxParticipants[0]; i++) {
    pricingTiers.push(calculateGroupPricing(basePrice, i));
  }

  useEffect(() => {
    if (isCreator) {
      loadGroupSettings();
    }
  }, [creatorId, isCreator]);

  const loadGroupSettings = async () => {
    try {
      // In real app, load from creator_group_settings table
      await new Promise(resolve => setTimeout(resolve, 500));
      // Mock data for now
      setGroupCallsEnabled(true);
      setMaxParticipants([6]);
      setRequireApproval(true);
      setAutoApproveThreshold(3);
    } catch (error) {
      console.error('Error loading group settings:', error);
    }
  };

  const saveGroupSettings = async () => {
    if (!user || !isCreator) return;

    try {
      setLoading(true);
      
      // In real app, save to creator_group_settings table
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Group call settings saved!');
    } catch (error) {
      console.error('Error saving group settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (!isCreator) {
    // Fan view - show pricing tiers for joining
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Call Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            <p>Join others to save money! More participants = lower cost per person.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pricingTiers.slice(0, 6).map((tier) => (
              <Card key={tier.participants} className="relative border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-3 text-center">
                  {tier.participants === 1 && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      1-on-1
                    </Badge>
                  )}
                  <div className="text-lg font-bold">{tier.participants}</div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {tier.participants === 1 ? 'person' : 'people'}
                  </div>
                  <div className="text-lg font-semibold text-primary">
                    ${tier.pricePerPerson}
                  </div>
                  <div className="text-xs text-muted-foreground">per person</div>
                  {tier.participants > 1 && (
                    <div className="text-xs text-green-600 mt-1">
                      Save ${(pricingTiers[0].pricePerPerson - tier.pricePerPerson).toFixed(2)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Smart Pricing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The more people who join, the less you pay - but the creator earns more total revenue. Everyone wins!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Creator view - settings and revenue projections
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Call Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Enable Group Calls</Label>
              <p className="text-sm text-muted-foreground">
                Allow fans to join your 1-on-1 calls as group sessions
              </p>
            </div>
            <Switch 
              checked={groupCallsEnabled} 
              onCheckedChange={setGroupCallsEnabled}
            />
          </div>

          {groupCallsEnabled && (
            <>
              <div className="space-y-3">
                <Label>Maximum Participants: {maxParticipants[0]}</Label>
                <Slider
                  value={maxParticipants}
                  onValueChange={setMaxParticipants}
                  max={15}
                  min={2}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2 people</span>
                  <span>15 people</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Require Manual Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    You'll approve each person before they can join
                  </p>
                </div>
                <Switch 
                  checked={requireApproval} 
                  onCheckedChange={setRequireApproval}
                />
              </div>

              {requireApproval && (
                <div className="space-y-2">
                  <Label>Auto-approve after {autoApproveThreshold} people</Label>
                  <Input
                    type="number"
                    value={autoApproveThreshold}
                    onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
                    min={2}
                    max={maxParticipants[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Once this many people join, new requests are auto-approved
                  </p>
                </div>
              )}

              <Button onClick={saveGroupSettings} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {groupCallsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Revenue Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              <p>See how group calls increase your earnings while giving fans better value.</p>
            </div>

            <div className="space-y-3">
              {pricingTiers.slice(0, 8).map((tier, index) => (
                <div key={tier.participants} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {tier.participants === 1 ? (
                        <Crown className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-sm font-semibold">{tier.participants}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {tier.participants} {tier.participants === 1 ? 'person' : 'people'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${tier.pricePerPerson} per person
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      ${tier.totalRevenue}
                    </div>
                    {tier.participants > 1 && (
                      <div className="text-sm text-green-600">
                        +${(tier.totalRevenue - pricingTiers[0].totalRevenue).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Revenue Impact</span>
              </div>
              <p className="text-sm text-green-700">
                A full group call ({maxParticipants[0]} people) generates{' '}
                <span className="font-bold">
                  ${(pricingTiers[maxParticipants[0] - 1].totalRevenue - basePrice).toFixed(2)} more
                </span>{' '}
                than a 1-on-1 call, while each fan saves{' '}
                <span className="font-bold">
                  ${(basePrice - pricingTiers[maxParticipants[0] - 1].pricePerPerson).toFixed(2)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}