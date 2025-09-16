import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  TrendingUp, 
  Brain, 
  Shield, 
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketRatePricingProps {
  creatorId: string;
  currentPricing?: {
    id: string;
    price_per_block: number;
    duration_minutes: number;
    pricing_mode: 'manual' | 'market_rate';
  };
  onPricingUpdate?: () => void;
}

export function MarketRatePricing({ creatorId, currentPricing, onPricingUpdate }: MarketRatePricingProps) {
  const [isMarketRateEnabled, setIsMarketRateEnabled] = useState(
    currentPricing?.pricing_mode === 'market_rate'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [socialMetrics, setSocialMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (isMarketRateEnabled) {
      loadMarketData();
    }
  }, [isMarketRateEnabled, creatorId]);

  const loadMarketData = async () => {
    try {
      // Load existing performance metrics
      const { data: metrics } = await supabase
        .from('call_performance_metrics')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (metrics) {
        setPerformanceMetrics(metrics);
      }

      // Load social analysis
      const { data: social } = await supabase
        .from('creator_social_analysis')
        .select('*')
        .eq('creator_id', creatorId);

      if (social) {
        setSocialMetrics(social);
      }
    } catch (error) {
      console.error('Error loading market data:', error);
    }
  };

  const toggleMarketRate = async () => {
    if (!isMarketRateEnabled) {
      // Enabling market rate - run analysis first
      await runMarketAnalysis();
    } else {
      // Disabling market rate - switch back to manual
      await updatePricingMode('manual');
    }
  };

  const runMarketAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // First, run social media analysis if we don't have recent data
      if (socialMetrics.length === 0) {
        await runSocialAnalysis();
      }

      // Run performance tracking
      await runPerformanceTracking();

      // Run AI market rate analysis
      const { data, error } = await supabase.functions.invoke('ai-market-rate-analysis', {
        body: { creator_id: creatorId }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        await updatePricingMode('market_rate');
        toast.success('Market rate analysis complete! Your pricing is now AI-optimized.');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error running market analysis:', error);
      toast.error('Failed to analyze market rates. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runSocialAnalysis = async () => {
    // Simulate running social analysis for demo
    const platforms = ['youtube', 'twitter', 'instagram'];
    const usernames = ['creator_demo', 'demo_creator', 'test_creator'];

    for (let i = 0; i < platforms.length; i++) {
      try {
        await supabase.functions.invoke('social-media-scraper', {
          body: {
            creator_id: creatorId,
            platform: platforms[i],
            username: usernames[i]
          }
        });
      } catch (error) {
        console.error(`Error analyzing ${platforms[i]}:`, error);
      }
    }
  };

  const runPerformanceTracking = async () => {
    try {
      await supabase.functions.invoke('performance-tracker', {
        body: { creator_id: creatorId, period_days: 30 }
      });
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  };

  const updatePricingMode = async (mode: 'manual' | 'market_rate') => {
    try {
      if (currentPricing) {
        const { error } = await supabase
          .from('creator_call_pricing')
          .update({ pricing_mode: mode })
          .eq('id', currentPricing.id);

        if (error) throw error;
      }

      setIsMarketRateEnabled(mode === 'market_rate');
      onPricingUpdate?.();
    } catch (error) {
      console.error('Error updating pricing mode:', error);
      toast.error('Failed to update pricing mode');
    }
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'premium': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'mid-tier': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'budget': return 'bg-gradient-to-r from-green-500 to-teal-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Rate Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>AI Market Rate Pricing</span>
                  <Badge variant="secondary">BETA</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Let AI analyze your market value and optimize pricing automatically
                </p>
              </div>
            </div>
            <Switch
              checked={isMarketRateEnabled}
              onCheckedChange={toggleMarketRate}
              disabled={isAnalyzing}
            />
          </div>
        </CardHeader>

        {!isMarketRateEnabled && (
          <CardContent>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">
                    Enable AI-Powered Pricing
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Our AI analyzes your social media presence, performance metrics, press coverage, 
                    and competitor data to suggest optimal pricing that maximizes your earnings.
                  </p>
                  <ul className="text-sm text-purple-600 dark:text-purple-400 mt-2 space-y-1">
                    <li>• Continuous price optimization based on demand</li>
                    <li>• Social media influence analysis</li>
                    <li>• Press coverage impact assessment</li>
                    <li>• Competitor benchmarking</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Analyzing Your Market Value</h4>
                  <p className="text-sm text-muted-foreground">
                    This may take a few moments as we analyze multiple data sources...
                  </p>
                </div>
              </div>
              <Progress value={75} className="w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Social Media</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Performance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI Analysis</span>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                  <span>Optimization</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Analysis Results */}
      {isMarketRateEnabled && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Market Position</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`${getMarketPositionColor(analysis.market_position)} text-white rounded-lg p-4`}>
                  <div className="text-2xl font-bold capitalize">
                    {analysis.market_position.replace('-', ' ')} Tier
                  </div>
                  <div className="text-sm opacity-90">
                    AI Confidence: {analysis.confidence_score}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Suggested Rate</span>
                    <span className="font-bold">
                      ${analysis.suggested_price_per_minute}/min
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on comprehensive market analysis
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceMetrics ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Caller Velocity</span>
                    <span className="font-medium">
                      {performanceMetrics.caller_velocity.toFixed(1)} calls/hour
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Conversion Rate</span>
                    <span className="font-medium">
                      {performanceMetrics.conversion_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Repeat Callers</span>
                    <span className="font-medium">
                      {performanceMetrics.repeat_caller_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue (30d)</span>
                    <span className="font-medium">
                      ${performanceMetrics.total_revenue}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">
                    No performance data available yet.
                    Start taking calls to build your metrics.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Social Media Metrics */}
      {isMarketRateEnabled && socialMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Social Media Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {socialMetrics.map((social, index) => (
                <div key={index} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{social.platform}</span>
                    <Badge variant="outline">{social.follower_count.toLocaleString()}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Engagement</span>
                      <span>{social.engagement_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Influence Score</span>
                      <span>{social.influence_score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality Score</span>
                      <span>{social.audience_quality_score}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Notice */}
      {isMarketRateEnabled && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100">
                  Privacy & Control
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Your market rate is never visible to you or customers. Our AI continuously 
                  adjusts pricing to optimize your earnings based on real-time demand and performance.
                  You can switch back to manual pricing anytime.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}