import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReliabilityData {
  creator_id: string;
  total_appointments: number;
  kept_appointments: number;
  cancelled_appointments: number;
  rescheduled_appointments: number;
  reliability_score: number;
  last_updated: string;
}

interface ReliabilityScoreProps {
  creatorId: string;
  showDetails?: boolean;
}

export function ReliabilityScore({ creatorId, showDetails = false }: ReliabilityScoreProps) {
  const [reliabilityData, setReliabilityData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReliabilityData();
  }, [creatorId]);

  const loadReliabilityData = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_reliability')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      setReliabilityData(data);
    } catch (error) {
      console.error('Error loading reliability data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-muted h-6 w-20 rounded"></div>;
  }

  if (!reliabilityData) {
    return (
      <Badge variant="secondary" className="text-sm">
        <Award className="h-3 w-3 mr-1" />
        New Creator
      </Badge>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 75) return <Award className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 95) return 'Excellent';
    if (score >= 85) return 'Very Good';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  if (!showDetails) {
    return (
      <div className="flex items-center space-x-2">
        {getScoreIcon(reliabilityData.reliability_score)}
        <span className={`font-medium ${getScoreColor(reliabilityData.reliability_score)}`}>
          {reliabilityData.reliability_score.toFixed(0)}% reliable
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getScoreIcon(reliabilityData.reliability_score)}
          <span>Reliability Score</span>
          <Badge variant="secondary" className={getScoreColor(reliabilityData.reliability_score)}>
            {getScoreLabel(reliabilityData.reliability_score)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(reliabilityData.reliability_score)}`}>
              {reliabilityData.reliability_score.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={reliabilityData.reliability_score} 
            className="h-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Appointments</p>
            <p className="font-medium">{reliabilityData.total_appointments}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Completed</p>
            <p className="font-medium text-green-600">{reliabilityData.kept_appointments}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cancelled</p>
            <p className="font-medium text-red-600">{reliabilityData.cancelled_appointments}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Rescheduled</p>
            <p className="font-medium text-yellow-600">{reliabilityData.rescheduled_appointments}</p>
          </div>
        </div>

        {reliabilityData.total_appointments > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>
              Completion Rate: {((reliabilityData.kept_appointments / reliabilityData.total_appointments) * 100).toFixed(1)}%
            </p>
            <p>
              Cancellation Rate: {((reliabilityData.cancelled_appointments / reliabilityData.total_appointments) * 100).toFixed(1)}%
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Reliability score decreases by 10% for each creator cancellation</p>
          <p>• Rescheduling has no penalty on the score</p>
          <p>• Score resets to 100% for new creators</p>
        </div>
      </CardContent>
    </Card>
  );
}