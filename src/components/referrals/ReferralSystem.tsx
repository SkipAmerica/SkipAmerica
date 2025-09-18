import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Copy, Share2, Users, DollarSign, Trophy, Gift, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";

interface ReferralCode {
  id: string;
  code: string;
  uses_count: number;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  thisMonthReferrals: number;
  thisMonthEarnings: number;
}

export function ReferralSystem() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    thisMonthReferrals: 0,
    thisMonthEarnings: 0
  });
  const [customCode, setCustomCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    try {
      // Load existing referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (codeError && codeError.code !== 'PGRST116') {
        throw codeError;
      }

      if (codeData) {
        setReferralCode(codeData);
      }

      // Simulate stats (in real app, these would come from tracking referral usage)
      setStats({
        totalReferrals: Math.floor(Math.random() * 50),
        totalEarnings: Math.floor(Math.random() * 500),
        thisMonthReferrals: Math.floor(Math.random() * 10),
        thisMonthEarnings: Math.floor(Math.random() * 100)
      });
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (!user) return;

    try {
      const code = customCode || `${user.email?.split('@')[0]?.toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('referral_codes')
        .upsert({
          creator_id: user.id,
          code: code,
          commission_rate: 10.0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setReferralCode(data);
      setCustomCode("");
      toast.success("Referral code generated successfully!");
    } catch (error: any) {
      console.error('Error generating referral code:', error);
      if (error.code === '23505') {
        toast.error("This code is already taken. Please try a different one.");
      } else {
        toast.error("Failed to generate referral code");
      }
    }
  };

  const copyReferralLink = async () => {
    if (!referralCode) return;

    const link = `${window.location.origin}?ref=${referralCode.code}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error("Failed to copy link");
    }
  };

  const shareReferralLink = async () => {
    if (!referralCode) return;

    const link = `${window.location.origin}?ref=${referralCode.code}`;
    const text = `Join Skip and connect with amazing creators! Use my referral code: ${referralCode.code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Skip',
          text: text,
          url: link,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying
      copyReferralLink();
    }
  };

  const toggleCodeStatus = async () => {
    if (!referralCode) return;

    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .update({ is_active: !referralCode.is_active })
        .eq('id', referralCode.id)
        .select()
        .single();

      if (error) throw error;

      setReferralCode(data);
      toast.success(`Referral code ${data.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling code status:', error);
      toast.error("Failed to update code status");
    }
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
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Referral Program</h2>
        <p className="text-muted-foreground">
          Earn 10% commission on every referral for their first year
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">${stats.totalEarnings}</div>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.thisMonthReferrals}</div>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">${stats.thisMonthEarnings}</div>
            <p className="text-sm text-muted-foreground">Month Earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Management */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg">
                  {referralCode.code}
                </div>
                <Badge variant={referralCode.is_active ? "default" : "secondary"}>
                  {referralCode.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Uses: </span>
                  <span className="font-semibold">{referralCode.uses_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission: </span>
                  <span className="font-semibold">{referralCode.commission_rate}%</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={copyReferralLink} className="flex-1">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button onClick={shareReferralLink} variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button onClick={toggleCodeStatus} variant="outline">
                  {referralCode.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Referral link: {window.location.origin}?ref={referralCode.code}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Create your unique referral code to start earning commissions
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Custom code (optional)"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
                <Button onClick={generateReferralCode}>
                  Generate Code
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate a unique code
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Referrals Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Share Your Code</h4>
                <p className="text-sm text-muted-foreground">
                  Share your referral link with friends, followers, or anyone interested in Skip
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold">They Sign Up</h4>
                <p className="text-sm text-muted-foreground">
                  When someone uses your code to join Skip and makes their first purchase
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold">You Earn Commission</h4>
                <p className="text-sm text-muted-foreground">
                  Receive 10% of their spending for their first year on the platform
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Referrals</span>
              <span className="text-sm text-muted-foreground">{stats.thisMonthReferrals}/20</span>
            </div>
            <Progress value={(stats.thisMonthReferrals / 20) * 100} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Earnings</span>
              <span className="text-sm text-muted-foreground">${stats.thisMonthEarnings}/$200</span>
            </div>
            <Progress value={(stats.thisMonthEarnings / 200) * 100} className="h-2" />
          </div>

          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">🎯 Reach 20 referrals this month!</h4>
            <p className="text-sm text-muted-foreground">
              Just {20 - stats.thisMonthReferrals} more referrals to unlock a bonus payout
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}