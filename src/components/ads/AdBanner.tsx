import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/providers/auth-provider";

interface AdBannerProps {
  placement: 'banner' | 'popup' | 'sponsored_creator' | 'feed_ad';
  targetCreatorId?: string;
}

interface Sponsor {
  id: string;
  company_name: string;
  logo_url?: string;
  website_url?: string;
}

export function AdBanner({ placement, targetCreatorId }: AdBannerProps) {
  const { user } = useAuth();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [adId, setAdId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    loadAd();
  }, [placement, targetCreatorId, user]);

  const loadAd = async () => {
    try {
      // Get a random sponsor
      const { data: sponsors } = await supabase
        .from('sponsors')
        .select('*')
        .eq('status', 'active')
        .limit(1);

      if (sponsors && sponsors.length > 0) {
        const selectedSponsor = sponsors[0];
        setSponsor(selectedSponsor);

        // Record the ad placement
        const { data: adPlacement } = await supabase
          .from('ad_placements')
          .insert({
            sponsor_id: selectedSponsor.id,
            placement_type: placement,
            target_user_id: user?.id,
            target_creator_id: targetCreatorId,
            impressions: 1,
          })
          .select()
          .single();

        if (adPlacement) {
          setAdId(adPlacement.id);
        }
      }
    } catch (error) {
      console.error('Error loading ad:', error);
    }
  };

  const handleAdClick = async () => {
    if (adId) {
      // Track click
      await supabase
        .from('ad_placements')
        .update({ 
          clicks: 1,
          revenue_generated: 0.25 // $0.25 per click
        })
        .eq('id', adId);
    }

    if (sponsor?.website_url) {
      window.open(sponsor.website_url, '_blank');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!sponsor || !isVisible) return null;

  const adContent = (
    <div className="flex items-center gap-4 p-4">
      {sponsor.logo_url && (
        <img 
          src={sponsor.logo_url} 
          alt={sponsor.company_name}
          className="w-12 h-12 object-contain rounded"
        />
      )}
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-1">Sponsored</p>
        <h3 className="font-semibold">{sponsor.company_name}</h3>
        <p className="text-sm text-muted-foreground">
          Discover amazing products and services
        </p>
      </div>
      <Button 
        onClick={handleAdClick}
        variant="outline" 
        size="sm"
        className="gap-2"
      >
        Learn More <ExternalLink className="w-4 h-4" />
      </Button>
      {placement === 'popup' && (
        <Button
          onClick={handleClose}
          variant="ghost"
          size="sm"
          className="p-1"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  if (placement === 'popup') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="max-w-md mx-4 bg-card">
          {adContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="bg-card border border-border/50">
      {adContent}
    </Card>
  );
}