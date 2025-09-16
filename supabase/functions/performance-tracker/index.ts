import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { creator_id, period_days = 7 } = await req.json();
    
    if (!creator_id) {
      throw new Error('Creator ID is required');
    }

    console.log(`Tracking performance for creator ${creator_id} over ${period_days} days`);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period_days);
    const periodEnd = new Date();

    // Fetch call data from appointments table
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('creator_id', creator_id)
      .gte('scheduled_at', periodStart.toISOString())
      .lte('scheduled_at', periodEnd.toISOString());

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    // Calculate performance metrics
    const totalCalls = appointments?.length || 0;
    const completedCalls = appointments?.filter(a => a.status === 'completed') || [];
    const totalRevenue = completedCalls.reduce((sum, call) => sum + Number(call.amount), 0);
    const avgCallDuration = completedCalls.length > 0 
      ? completedCalls.reduce((sum, call) => sum + call.duration_minutes, 0) / completedCalls.length 
      : 0;

    // Calculate caller velocity (calls per hour during active periods)
    const activePeriods = calculateActivePeriods(appointments || []);
    const callerVelocity = activePeriods.totalHours > 0 
      ? totalCalls / activePeriods.totalHours 
      : 0;

    // Calculate repeat caller rate
    const uniqueCallers = new Set(appointments?.map(a => a.fan_id) || []).size;
    const repeatCallerRate = uniqueCallers > 0 
      ? ((totalCalls - uniqueCallers) / totalCalls) * 100 
      : 0;

    // Simulate additional metrics (in production, these would come from real data)
    const avgWaitTime = Math.random() * 10 + 2; // 2-12 minutes average wait
    const conversionRate = Math.random() * 15 + 5; // 5-20% conversion rate
    const priceSensitivityScore = Math.random() * 50 + 25; // 25-75 sensitivity score

    // Get current pricing to track price sensitivity
    const { data: currentPricing } = await supabaseAdmin
      .from('creator_call_pricing')
      .select('*')
      .eq('creator_id', creator_id)
      .eq('is_active', true)
      .single();

    // Save performance metrics
    const { data: savedMetrics, error: saveError } = await supabaseAdmin
      .from('call_performance_metrics')
      .insert({
        creator_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_calls: totalCalls,
        total_revenue: totalRevenue,
        avg_call_duration: avgCallDuration,
        caller_velocity: callerVelocity,
        repeat_caller_rate: repeatCallerRate,
        avg_wait_time: avgWaitTime,
        conversion_rate: conversionRate,
        price_sensitivity_score: priceSensitivityScore
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving performance metrics:', saveError);
      throw new Error(`Failed to save metrics: ${saveError.message}`);
    }

    // Analyze trends and recommend price adjustments
    const { data: recentMetrics } = await supabaseAdmin
      .from('call_performance_metrics')
      .select('*')
      .eq('creator_id', creator_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const trendAnalysis = analyzeTrends(recentMetrics || []);
    const priceRecommendation = generatePriceRecommendation(
      savedMetrics,
      trendAnalysis,
      currentPricing
    );

    console.log('Performance tracking completed');

    return new Response(JSON.stringify({
      success: true,
      metrics: savedMetrics,
      trends: trendAnalysis,
      price_recommendation: priceRecommendation,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        days: period_days
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in performance-tracker:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateActivePeriods(appointments: any[]) {
  if (appointments.length === 0) {
    return { totalHours: 0, activeDays: 0 };
  }

  // Group appointments by day
  const dayGroups = appointments.reduce((groups, appointment) => {
    const day = new Date(appointment.scheduled_at).toDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(appointment);
    return groups;
  }, {} as Record<string, any[]>);

  let totalActiveHours = 0;
  const activeDays = Object.keys(dayGroups).length;

  // Calculate active hours per day (assuming 8-hour active periods on days with calls)
  Object.values(dayGroups).forEach(dayAppointments => {
    if (dayAppointments.length > 0) {
      // Estimate active hours based on call distribution
      const hoursWithCalls = Math.min(8, Math.max(2, dayAppointments.length * 0.5));
      totalActiveHours += hoursWithCalls;
    }
  });

  return {
    totalHours: totalActiveHours,
    activeDays
  };
}

function analyzeTrends(metrics: any[]) {
  if (metrics.length < 2) {
    return {
      call_volume_trend: 'insufficient_data',
      revenue_trend: 'insufficient_data',
      conversion_trend: 'insufficient_data'
    };
  }

  const latest = metrics[0];
  const previous = metrics[1];

  const callVolumeTrend = latest.total_calls > previous.total_calls ? 'increasing' :
                         latest.total_calls < previous.total_calls ? 'decreasing' : 'stable';

  const revenueTrend = latest.total_revenue > previous.total_revenue ? 'increasing' :
                      latest.total_revenue < previous.total_revenue ? 'decreasing' : 'stable';

  const conversionTrend = latest.conversion_rate > previous.conversion_rate ? 'improving' :
                         latest.conversion_rate < previous.conversion_rate ? 'declining' : 'stable';

  return {
    call_volume_trend: callVolumeTrend,
    revenue_trend: revenueTrend,
    conversion_trend: conversionTrend,
    velocity_change: latest.caller_velocity - previous.caller_velocity,
    repeat_rate_change: latest.repeat_caller_rate - previous.repeat_caller_rate
  };
}

function generatePriceRecommendation(currentMetrics: any, trends: any, currentPricing: any) {
  const callerVelocity = currentMetrics.caller_velocity;
  const conversionRate = currentMetrics.conversion_rate;
  const priceSensitivity = currentMetrics.price_sensitivity_score;

  let recommendation = 'maintain';
  let confidence = 50;
  let reasoning = [];

  // High velocity + good conversion = increase price
  if (callerVelocity > 2 && conversionRate > 15 && priceSensitivity < 40) {
    recommendation = 'increase';
    confidence = 75;
    reasoning.push('High caller velocity indicates strong demand');
    reasoning.push('Good conversion rate suggests price acceptance');
  }
  // Low velocity + declining conversion = decrease price
  else if (callerVelocity < 0.5 && conversionRate < 8 && trends.conversion_trend === 'declining') {
    recommendation = 'decrease';
    confidence = 70;
    reasoning.push('Low caller velocity suggests pricing resistance');
    reasoning.push('Declining conversion indicates overpricing');
  }
  // Increasing trends = slight increase
  else if (trends.call_volume_trend === 'increasing' && trends.revenue_trend === 'increasing') {
    recommendation = 'slight_increase';
    confidence = 60;
    reasoning.push('Positive trends in volume and revenue');
  }

  const currentPrice = currentPricing?.price_per_block || 0;
  let suggestedPriceChange = 0;

  if (recommendation === 'increase') {
    suggestedPriceChange = currentPrice * 0.15; // 15% increase
  } else if (recommendation === 'decrease') {
    suggestedPriceChange = -currentPrice * 0.10; // 10% decrease
  } else if (recommendation === 'slight_increase') {
    suggestedPriceChange = currentPrice * 0.05; // 5% increase
  }

  return {
    action: recommendation,
    confidence_score: confidence,
    current_price: currentPrice,
    suggested_price_change: suggestedPriceChange,
    new_suggested_price: currentPrice + suggestedPriceChange,
    reasoning
  };
}