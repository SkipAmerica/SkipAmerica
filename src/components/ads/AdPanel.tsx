import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
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
    <div 
      className="group relative overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative h-20 w-full overflow-hidden rounded-lg">
        <img
          src={getImageSrc(ad.imageUrl)}
          alt={ad.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg"
          loading="lazy"
        />
      </div>
    </div>
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
        "w-full bg-white",
        className
      )}
    >
      <div className="px-4 py-2">
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
              <div className="w-full h-20 bg-muted/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Ad</span>
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
              <div className="w-full h-20 bg-muted/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Ad</span>
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
              <div className="w-full h-20 bg-muted/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Ad</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};