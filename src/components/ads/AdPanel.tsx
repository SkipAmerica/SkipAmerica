import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { useAdManager, AdData } from '@/hooks/useAdManager';
import { toast } from 'sonner';

// Import the generated ad images
import adCreators from '@/assets/ads/ad-creators.jpg';
import adEvents from '@/assets/ads/ad-events.jpg';
import adPremium from '@/assets/ads/ad-premium.jpg';

interface AdPanelProps {
  className?: string;
}

interface AdCardProps {
  ad: AdData;
  onImpression: (adId: string) => void;
  onClick: (adId: string) => void;
}

const AdCard: React.FC<AdCardProps> = ({ ad, onImpression, onClick }) => {
  // Track impression when ad comes into view
  useEffect(() => {
    onImpression(ad.id);
  }, [ad.id, onImpression]);

  const handleClick = () => {
    onClick(ad.id);
    
    // Handle different ad types
    switch (ad.adType) {
      case 'creator':
        toast.success('Exploring top creators...');
        break;
      case 'event':
        toast.success('Loading upcoming events...');
        break;
      case 'premium':
        toast.success('Showing premium features...');
        break;
      default:
        toast.success('Opening link...');
    }
  };

  // Map image URLs to imported assets for proper bundling
  const getImageSrc = (imageUrl: string) => {
    if (imageUrl.includes('ad-creators')) return adCreators;
    if (imageUrl.includes('ad-events')) return adEvents;
    if (imageUrl.includes('ad-premium')) return adPremium;
    return imageUrl;
  };

  return (
    <Card className="group relative overflow-hidden bg-white hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] cursor-pointer border-0 shadow-sm">
      <div className="relative h-32 overflow-hidden">
        <img
          src={getImageSrc(ad.imageUrl)}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Ad Type Badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-primary flex items-center gap-1">
            <TrendingUp size={10} />
            {ad.adType}
          </div>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
          {ad.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {ad.description}
        </p>
        
        <Button
          onClick={handleClick}
          size="sm"
          className="w-full h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          {ad.buttonText}
          <ExternalLink size={12} className="ml-1" />
        </Button>
        
        {/* Analytics Badge */}
        {(ad.impressions || ad.clicks) && (
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{ad.impressions || 0} views</span>
            <span>{ad.clicks || 0} clicks</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export const AdPanel: React.FC<AdPanelProps> = ({ className }) => {
  const { getAdsByPosition, trackImpression, trackClick, loading, error } = useAdManager();
  
  const positions = getAdsByPosition();
  const hasAds = positions.left || positions.center || positions.right;

  if (loading || error || !hasAds) {
    return null;
  }

  return (
    <div 
      className={cn(
        "sticky top-[calc(var(--debug-safe-top)+48px+60px)] z-40 w-full bg-white border-b border-border/20 shadow-sm",
        className
      )}
    >
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          {/* Left Ad */}
          <div className="flex justify-center">
            {positions.left ? (
              <AdCard
                ad={positions.left}
                onImpression={trackImpression}
                onClick={trackClick}
              />
            ) : (
              <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Ad Space</span>
              </div>
            )}
          </div>
          
          {/* Center Ad */}
          <div className="flex justify-center">
            {positions.center ? (
              <AdCard
                ad={positions.center}
                onImpression={trackImpression}
                onClick={trackClick}
              />
            ) : (
              <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Ad Space</span>
              </div>
            )}
          </div>
          
          {/* Right Ad */}
          <div className="flex justify-center">
            {positions.right ? (
              <AdCard
                ad={positions.right}
                onImpression={trackImpression}
                onClick={trackClick}
              />
            ) : (
              <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Ad Space</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};