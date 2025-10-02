import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Clock, DollarSign, User, Star } from 'lucide-react';

interface StripeCheckoutProps {
  creator: {
    id: string;
    full_name: string;
    avatar_url?: string;
    callRate?: number;
  };
  duration: number;
  scheduledTime: string;
  onSuccess?: () => void;
}

export function StripeCheckout({ creator, duration, scheduledTime, onSuccess }: StripeCheckoutProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const totalAmount = (creator.callRate || 50) * (duration / 60);

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('Please log in to book a session');
      }

      const { data, error } = await supabase.functions.invoke('create-call-checkout', {
        body: {
          creatorId: creator.id,
          duration,
          scheduledTime,
          amount: totalAmount
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        onSuccess?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Book Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.full_name} className="w-full h-full rounded-full object-contain" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="font-semibold">{creator.full_name}</p>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-muted-foreground">4.9 (234 reviews)</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
            </span>
            <span>{duration} minutes</span>
          </div>
          <div className="flex justify-between">
            <span>Rate per minute</span>
            <span>${creator.callRate || 50}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total Amount</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Scheduled for: {new Date(scheduledTime).toLocaleString()}
          </p>
        </div>

        <Button 
          onClick={handlePayment} 
          disabled={loading || !user}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Stripe. You'll be redirected to complete your payment.
        </p>
      </CardContent>
    </Card>
  );
}